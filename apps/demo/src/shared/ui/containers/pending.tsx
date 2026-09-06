// Route-level loading state. Rendered either standalone (root loader still running,
// so <Main> isn't mounted yet) or inside it on a later navigation — hence it centres
// itself instead of relying on a parent layout.
export const Pending = () => (
  <div className="flex min-h-[60svh] flex-1 flex-col items-center justify-center gap-4">
    <span
      role="status"
      aria-label="Loading"
      className="size-10 animate-spin rounded-full border-2 border-surface border-t-accent motion-reduce:animate-none"
    />
    <p className="text-sm text-muted">Loading…</p>
  </div>
)
