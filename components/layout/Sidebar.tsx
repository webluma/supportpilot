"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui/utils";

type NavItem = {
  label: string;
  href: string;
  match?: "prefix";
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app" },
  { label: "Tickets", href: "/app/tickets", match: "prefix" },
  { label: "New Ticket", href: "/app/tickets/new" },
  { label: "Settings", href: "/app/settings" },
];

function getActiveHref(pathname: string) {
  const exactMatch = navItems.find((item) => item.href === pathname);
  if (exactMatch) {
    return exactMatch.href;
  }
  const prefixMatch = navItems.find(
    (item) => item.match === "prefix" && pathname.startsWith(item.href),
  );
  return prefixMatch?.href;
}

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const activeHref = getActiveHref(pathname);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!isOpen}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-white px-4 py-6 shadow-xl transition-transform md:static md:z-auto md:min-h-screen md:w-64 md:translate-x-0 md:border-r md:border-slate-200 md:px-6 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <Link
            href="/app"
            className="text-lg font-semibold text-slate-900"
            onClick={onClose}
          >
            SupportPilot
          </Link>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
            App
          </span>
        </div>
        <nav className="mt-6 grid gap-1" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ring-offset-white",
                  isActive && "bg-slate-100 text-slate-900",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Demo workspace for SupportPilot.
        </div>
        <div className="mt-auto pt-6 text-xs text-slate-500">
          Created & Developed by WebLuma
        </div>
      </aside>
    </>
  );
}
