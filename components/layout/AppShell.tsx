"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--bg)] text-slate-900">
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar
            isMenuOpen={isSidebarOpen}
            onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
            currentPath={pathname}
          />
          <main className="flex-1 bg-gradient-to-b from-transparent via-transparent to-transparent">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
