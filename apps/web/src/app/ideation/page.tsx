"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";

const NONE = "__none__";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function IdeationPage() {
  const {
    dataset,
    addIdea,
    updateIdea,
    deleteIdea,
    saveIdeaVersion,
    convertIdeaToTask,
    pushToast,
  } = useAppState();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [projectId, setProjectId] = useState(NONE);
  const [filterProject, setFilterProject] = useState<"all" | "none" | string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addIdea({
      title: trimmed,
      body: body.trim() || null,
      link: link.trim() || null,
      project_id: projectId === NONE ? null : projectId,
    });
    pushToast("Ide tersimpan.");
    setTitle("");
    setBody("");
    setLink("");
    setProjectId(NONE);
  };

  const ideas = dataset.ideas.filter((i) => {
    if (filterProject === "all") return true;
    if (filterProject === "none") return i.project_id === null;
    return i.project_id === filterProject;
  });

  const openIdea = openId ? dataset.ideas.find((i) => i.id === openId) : null;
  const openHistory = openId ? dataset.ideaHistory.filter((h) => h.idea_id === openId) : [];

  return (
    <div className="mx-auto max-w-[1080px] px-7 py-6">
      <div className="font-serif text-2xl font-medium">Ideation</div>
      <p className="mb-4.5 mt-1 max-w-[560px] text-[12.5px] text-muted-foreground">
        Ide mentah berbentuk catatan — godok nanti, assign saat siap. Konversi ke task memindahkan
        isinya, ide lama akan hilang dari daftar.
      </p>

      <div className="grid grid-cols-[320px_1fr] items-start gap-5">
        <Card className="sticky top-4 gap-2.5 p-4">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul ide baru" />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tulis detailnya — bebas, mentah tidak apa-apa…"
            rows={5}
          />
          <Select value={projectId} onValueChange={(v) => setProjectId(v ?? NONE)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Belum di-assign</SelectItem>
              {dataset.projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Tempel link URL (opsional)" />
          <Button onClick={submit}>+ Simpan ide</Button>
        </Card>

        <div>
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {[
              { key: "all", label: "Semua" },
              { key: "none", label: "Belum di-assign" },
              ...dataset.projects.map((p) => ({ key: p.id, label: p.name })),
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterProject(f.key as typeof filterProject)}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] font-semibold ${
                  filterProject === f.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ideas.map((i) => {
              const project = dataset.projects.find((p) => p.id === i.project_id);
              return (
                <Card
                  key={i.id}
                  className="cursor-pointer gap-2 p-4 hover:border-faint"
                  onClick={() => setOpenId(i.id)}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-[11px] italic text-faint">{fmtDate(i.created_at)}</span>
                    <button
                      className="ml-auto text-[12px] text-faint hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteIdea(i.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="font-serif text-[16px] leading-snug font-medium text-pretty">{i.title}</div>
                  {i.body && <div className="text-[12.5px] leading-relaxed text-muted-foreground">{i.body}</div>}
                  <div className="mt-auto flex items-center gap-2 pt-1.5">
                    <span
                      className="h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: project?.color ?? "#8A857A" }}
                    />
                    <span className="truncate text-[11.5px] font-semibold text-muted-foreground">
                      {project?.name ?? "Belum di-assign"}
                    </span>
                    <button
                      className="ml-auto flex-none rounded-md border border-border px-2 py-1 text-[11px] font-bold text-primary hover:border-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        convertIdeaToTask(i.id);
                      }}
                    >
                      → Jadikan task
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
          {ideas.length === 0 && (
            <div className="p-9 text-center font-serif text-[15px] italic text-muted-foreground">
              belum ada apa-apa di sini
            </div>
          )}
        </div>
      </div>

      {openIdea && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setOpenId(null)}
        >
          <Card
            className="max-h-[85vh] w-full max-w-[520px] gap-3 overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={openIdea.title}
              onChange={(e) => updateIdea(openIdea.id, { title: e.target.value })}
              className="border-none px-0 font-serif text-lg font-medium shadow-none focus-visible:ring-0"
            />
            <Textarea
              value={openIdea.body ?? ""}
              onChange={(e) => updateIdea(openIdea.id, { body: e.target.value })}
              rows={5}
              placeholder="Tulis detailnya…"
            />
            <Input
              value={openIdea.link ?? ""}
              onChange={(e) => updateIdea(openIdea.id, { link: e.target.value })}
              placeholder="Link (opsional)"
            />
            <Select
              value={openIdea.project_id ?? NONE}
              onValueChange={(v) => updateIdea(openIdea.id, { project_id: v === NONE ? null : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Belum di-assign</SelectItem>
                {dataset.projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => saveIdeaVersion(openIdea.id)}>
                ✦ Simpan versi
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  convertIdeaToTask(openIdea.id);
                  setOpenId(null);
                }}
              >
                → Jadikan task
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => {
                  deleteIdea(openIdea.id);
                  setOpenId(null);
                }}
              >
                ✕
              </Button>
            </div>

            {openHistory.length > 0 && (
              <div className="mt-2 border-t border-border pt-3">
                <div className="mb-2 text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Riwayat versi
                </div>
                {openHistory.map((h) => (
                  <div key={h.id} className="flex gap-2 border-b border-border py-2 last:border-b-0">
                    <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-faint" />
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-[10.5px] italic text-faint">{fmtDate(h.created_at)}</div>
                      <div className="text-[12px] font-semibold">{h.title}</div>
                      {h.body && <div className="mt-0.5 text-[11px] text-muted-foreground">{h.body}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
