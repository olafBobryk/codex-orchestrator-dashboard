import type { ReactNode } from "react";

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <h4 className="mb-2 text-sm font-medium text-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}
