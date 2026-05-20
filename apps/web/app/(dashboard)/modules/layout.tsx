import { fraunces } from "@/lib/fonts";

export default function ModulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} min-h-screen`}>
      {children}
    </div>
  );
}
