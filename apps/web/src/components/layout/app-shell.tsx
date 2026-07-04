"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ToastViewport } from "@/components/layout/toast-viewport";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto">{children}</main>
      </div>
      <ToastViewport />
      <TaskDetailDrawer />
      <TaskFormDialog />
    </div>
  );
}
