import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins

// Foreground extraction = Vision subject mask UNION difference-vs-plate matte.
// Usage: maskbg2 <inDir> <outDir> <platePng>

let args = CommandLine.arguments
guard args.count == 4 else {
    print("usage: maskbg2 <inDir> <outDir> <platePng>")
    exit(1)
}
let inDir = args[1], outDir = args[2], platePath = args[3]
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

guard let plate = CIImage(contentsOf: URL(fileURLWithPath: platePath)) else {
    print("cannot read plate"); exit(1)
}

let ciContext = CIContext()

// The laptop + branch never move: one clean Vision mask of the plate,
// unioned into every frame, keeps the static subject fully intact.
var plateVision: CIImage? = nil
do {
    let req = VNGenerateForegroundInstanceMaskRequest()
    let h = VNImageRequestHandler(ciImage: plate)
    if (try? h.perform([req])) != nil, let r = req.results?.first,
       let buf = try? r.generateScaledMaskForImage(forInstances: r.allInstances, from: h) {
        plateVision = CIImage(cvPixelBuffer: buf)
    }
}
if plateVision == nil { print("WARN: no plate vision mask") }

// Dark pixels of the static plate are always foreground (bark, laptop body,
// contact shadow) — the studio background never gets below ~0.7 luma.
// alpha = clamp((0.62 - luma) / 0.12), softened.
var plateDark: CIImage? = nil
do {
    let gray = CIFilter.colorControls()
    gray.inputImage = plate
    gray.saturation = 0
    let ramp = CIFilter.colorMatrix()
    ramp.inputImage = gray.outputImage
    let k: CGFloat = -1.0 / 0.12
    let b: CGFloat = 0.62 / 0.12
    ramp.rVector = CIVector(x: k, y: 0, z: 0, w: 0)
    ramp.gVector = CIVector(x: 0, y: k, z: 0, w: 0)
    ramp.bVector = CIVector(x: 0, y: 0, z: k, w: 0)
    ramp.aVector = CIVector(x: 0, y: 0, z: 0, w: 0)
    ramp.biasVector = CIVector(x: b, y: b, z: b, w: 1)
    let cl = CIFilter.colorClamp()
    cl.inputImage = ramp.outputImage
    let bl = CIFilter.gaussianBlur()
    bl.inputImage = cl.outputImage
    bl.radius = 2
    plateDark = bl.outputImage?.cropped(to: plate.extent)
}

let files = try FileManager.default.contentsOfDirectory(atPath: inDir)
    .filter { $0.hasSuffix(".png") }
    .sorted()

// Soft ramp: alpha = clamp((diff - t0) / (t1 - t0))
let t0: CGFloat = 0.05, t1: CGFloat = 0.13
let scale = 1.0 / (t1 - t0)

for (idx, file) in files.enumerated() {
    let inURL = URL(fileURLWithPath: "\(inDir)/\(file)")
    let outURL = URL(fileURLWithPath: "\(outDir)/\(file)")
    guard let frame = CIImage(contentsOf: inURL) else { print("SKIP \(file)"); continue }

    // --- Normalize global exposure to the plate (AI video flickers) ---
    let patch = CGRect(x: 40, y: frame.extent.height - 240, width: 200, height: 200)
    func avg(_ img: CIImage) -> (CGFloat, CGFloat, CGFloat) {
        let f = CIFilter.areaAverage()
        f.inputImage = img
        f.extent = patch
        var px = [UInt8](repeating: 0, count: 4)
        ciContext.render(f.outputImage!, toBitmap: &px, rowBytes: 4,
                         bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
                         format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
        return (CGFloat(px[0]) / 255, CGFloat(px[1]) / 255, CGFloat(px[2]) / 255)
    }
    let (pr, pg, pb) = avg(plate)
    let (fr, fg, fb) = avg(frame)
    let gainF = CIFilter.colorMatrix()
    gainF.inputImage = frame
    gainF.rVector = CIVector(x: fr > 0 ? pr / fr : 1, y: 0, z: 0, w: 0)
    gainF.gVector = CIVector(x: 0, y: fg > 0 ? pg / fg : 1, z: 0, w: 0)
    gainF.bVector = CIVector(x: 0, y: 0, z: fb > 0 ? pb / fb : 1, w: 0)
    let normFrame = gainF.outputImage ?? frame

    // --- Difference matte against the plate ---
    let diffF = CIFilter.differenceBlendMode()
    diffF.inputImage = normFrame
    diffF.backgroundImage = plate
    let maxC = CIFilter.maximumComponent()
    maxC.inputImage = diffF.outputImage
    let ramp = CIFilter.colorMatrix()
    ramp.inputImage = maxC.outputImage
    ramp.rVector = CIVector(x: scale, y: 0, z: 0, w: 0)
    ramp.gVector = CIVector(x: 0, y: scale, z: 0, w: 0)
    ramp.bVector = CIVector(x: 0, y: 0, z: scale, w: 0)
    ramp.aVector = CIVector(x: 0, y: 0, z: 0, w: 0)
    ramp.biasVector = CIVector(x: -t0 * scale, y: -t0 * scale, z: -t0 * scale, w: 1)
    let clamp = CIFilter.colorClamp()
    clamp.inputImage = ramp.outputImage
    let close1 = CIFilter.morphologyMaximum()
    close1.inputImage = clamp.outputImage
    close1.radius = 3
    let close2 = CIFilter.morphologyMinimum()
    close2.inputImage = close1.outputImage
    close2.radius = 2
    let blur = CIFilter.gaussianBlur()
    blur.inputImage = close2.outputImage
    blur.radius = 1.0
    guard var diffMatte = blur.outputImage else { continue }
    diffMatte = diffMatte.cropped(to: frame.extent)

    // --- Vision subject mask ---
    var visionMatte: CIImage? = nil
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(ciImage: frame)
    if (try? handler.perform([request])) != nil,
       let result = request.results?.first,
       let maskBuf = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler) {
        visionMatte = CIImage(cvPixelBuffer: maskBuf)
    }

    // --- Union (lighten = per-pixel max) ---
    var matte = diffMatte
    for extra in [visionMatte, plateVision, plateDark] {
        if let v = extra {
            let union = CIFilter.lightenBlendMode()
            union.inputImage = v
            union.backgroundImage = matte
            matte = union.outputImage ?? matte
        }
    }

    // --- Dilate matte: halo pixels are frame-bg colored, which matches the
    //     page, so dilation is invisible — but it fills edge nicks. ---
    let dilate = CIFilter.morphologyMaximum()
    dilate.inputImage = matte
    dilate.radius = 4
    let soften = CIFilter.gaussianBlur()
    soften.inputImage = dilate.outputImage
    soften.radius = 1.0
    matte = (soften.outputImage ?? matte).cropped(to: frame.extent)

    // --- Apply matte as alpha over transparent ---
    let blend = CIFilter.blendWithMask()
    blend.inputImage = frame
    blend.backgroundImage = CIImage.empty().cropped(to: frame.extent)
    blend.maskImage = matte
    guard let out = blend.outputImage,
          let png = ciContext.pngRepresentation(of: out, format: .RGBA8,
              colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!) else {
        print("FAIL \(file)"); continue
    }
    try? png.write(to: outURL)
    if (idx + 1) % 20 == 0 || idx == files.count - 1 {
        print("done \(idx + 1)/\(files.count)")
    }
}
