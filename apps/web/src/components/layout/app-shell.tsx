"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/topbar";
import { ToastViewport } from "@/components/layout/toast-viewport";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { useAppState } from "@/lib/app-state";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/login");
  const { loading, loadError, retryLoad } = useAppState();

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto">
          {loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="font-serif text-xl italic text-destructive">Gagal memuat data.</div>
              <div className="max-w-[380px] text-[12.5px] text-muted-foreground">{loadError}</div>
              <Button variant="outline" onClick={retryLoad}>
                Coba lagi
              </Button>
            </div>
          ) : loading ? (
            <div className="mx-auto max-w-[1160px] animate-pulse px-7 py-6">
              <div className="mb-5 h-7 w-40 rounded bg-muted" />
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[130px] rounded-2xl bg-muted" />
                ))}
              </div>
              <div className="mt-6 h-64 rounded-2xl bg-muted" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <ToastViewport />
      <TaskDetailDrawer />
      <TaskFormDialog />
    </div>
  );
}
