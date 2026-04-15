export default function Home() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Personal cooking + weight-loss dashboard.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card title="Today's meals" body="Configured in Step 5 (meal plan)." />
        <Card title="Macros" body="Configured in Step 1 (profile)." />
        <Card title="Water" body="Configured in Step 2." />
        <Card title="Next cook day" body="Configured in Step 5." />
      </section>

      <p className="text-sm text-zinc-500">
        Step 0 shell is live. See <code>PLAN.md</code> for the full roadmap.
      </p>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}
