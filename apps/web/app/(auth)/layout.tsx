export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
