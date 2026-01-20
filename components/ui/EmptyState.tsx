import type { ReactNode } from "react";

import { cn } from "./utils";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-left",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-600">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
