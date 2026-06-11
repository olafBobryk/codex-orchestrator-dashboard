import { Loader } from "@/components/ui/loader";

export function GraphLoadingState() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-background/72 backdrop-blur-[1px]">
      <Loader aria-label="Loading graph" size="lg" />
    </div>
  );
}

export function GraphEmptyState() {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-background px-6">
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-normal text-foreground">
          No graph nodes
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          This workspace has orchestration docs, but the current strategy does
          not project any workpieces or checkpoints yet.
        </p>
      </div>
    </div>
  );
}
