// Route-level loading state. Rendered either standalone (root loader still running,
// so <Main> isn't mounted yet) or inside it on a later navigation — hence it centres
// itself instead of relying on a parent layout.
export const Pending = () => (
  <div className="flex min-h-[60svh] flex-1 flex-col items-center justify-center gap-4">
    <span
      role="status"
      aria-label="Loading"
      className="size-10 animate-spin rounded-full border-2 border-[#3d3d3d] border-t-purple-400"
    />
    <p className="text-sm text-[#9aa0ac]">Loading…</p>
  </div>
)
