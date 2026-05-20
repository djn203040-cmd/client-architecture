export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="rounded-2xl backdrop-blur-md bg-white/10 dark:bg-white/5 border border-white/10 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] max-w-md w-full text-center space-y-4">
        {sp.done ? (
          <>
            <h1 className="text-xl font-semibold">You have been unsubscribed</h1>
            <p className="text-sm text-muted-foreground">
              You will no longer receive messages from this coach.
            </p>
          </>
        ) : sp.error === "invalid_token" ? (
          <>
            <h1 className="text-xl font-semibold">Invalid link</h1>
            <p className="text-sm text-muted-foreground">
              This unsubscribe link is not valid. If you continue to receive
              messages, please reply directly to the email.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Not found</h1>
            <p className="text-sm text-muted-foreground">
              We could not process this request. Please reply to the email
              directly.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
