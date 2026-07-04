"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/app-state";
import { getUrgentGroups } from "@/lib/selectors";
import { cn } from "@/lib/utils";

function NavItem({
  href,
  label,
  active,
  badge,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-white/10 text-sidebar-primary font-semibold"
          : "text-sidebar-foreground hover:bg-white/5",
      )}
    >
      <span className="truncate">{label}</span>
      {!!badge && (
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-sidebar-primary">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { dataset, activeProjectId, setActiveProjectId, focusMode } = useAppState();
  const urgentGroups = getUrgentGroups(dataset, "all");
  const urgentCount = urgentGroups.reduce((sum, g) => sum + g.tasks.length, 0);

  return (
    <aside className="flex h-full w-[226px] flex-none flex-col gap-0.5 overflow-y-auto bg-sidebar p-3 pb-3.5">
      <div className="flex items-center gap-2 px-2 pb-4 pt-0.5">
        <div className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-primary font-serif text-[13px] font-semibold text-primary-foreground">
          Z
        </div>
        <div className="font-serif text-base font-semibold text-sidebar-primary">
          zen<span className="text-[#C97B54]">.</span>
        </div>
      </div>

      {!focusMode && (
        <>
          <NavItem href="/" label="Overview" active={pathname === "/"} />
          <NavItem
            href="/urgent"
            label="⚠ Urgent"
            active={pathname === "/urgent"}
            badge={urgentCount}
          />
        </>
      )}

      <div className="px-2 pb-1.5 pt-3.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
        Project
      </div>
      {dataset.projects
        .filter((p) => !focusMode || p.id === activeProjectId)
        .map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            onClick={() => setActiveProjectId(p.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
              pathname === `/projects/${p.id}`
                ? "bg-white/10 text-sidebar-primary font-semibold"
                : "text-sidebar-foreground hover:bg-white/5",
            )}
          >
            <span
              className="h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: p.color ?? "#8A857A" }}
            />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}

      {!focusMode && (
        <>
          <div className="my-2.5 h-px bg-white/10" />
          <NavItem href="/ideation" label="Ideation" active={pathname === "/ideation"} />
          <NavItem href="/inbox" label="Inbox" active={pathname === "/inbox"} />
          <NavItem href="/calendar" label="Calendar" active={pathname === "/calendar"} />
          <NavItem href="/weekly-review" label="Weekly Review" active={pathname === "/weekly-review"} />
          <NavItem href="/metrics" label="Metrics" active={pathname === "/metrics"} />
        </>
      )}

      <div className="mt-auto" />
      <NavItem href="/settings" label="Settings" active={pathname === "/settings"} />
    </aside>
  );
}
