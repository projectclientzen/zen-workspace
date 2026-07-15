"use client";

import { useState } from "react";
import { AttachmentImage } from "@/components/common/attachment-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";
import { uploadAttachment } from "@/lib/supabase/storage";
import type { Priority } from "@/lib/types";

const NONE = "__none__";

type CaptureMode = "task" | "idea";

export function CaptureSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { dataset, addTask, addIdea, pushToast } = useAppState();
  const [mode, setMode] = useState<CaptureMode>("task");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [projectId, setProjectId] = useState(NONE);
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setLink("");
    setProjectId(NONE);
    setPriority("medium");
    setDueDate("");
    setDueTime("");
    setImagePath(null);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadAttachment(file, mode === "task" ? "tasks" : "ideas");
      setImagePath(path);
    } catch (err) {
      console.error(err);
      pushToast("Gagal upload gambar.");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const project_id = projectId === NONE ? null : projectId;

    if (mode === "task") {
      let due_at: string | null = null;
      if (dueDate) {
        const time = dueTime || "17:00";
        due_at = new Date(`${dueDate}T${time}:00`).toISOString();
      }
      addTask({
        title: trimmed,
        notes: body.trim() || null,
        link: link.trim() || null,
        image_path: imagePath,
        project_id,
        priority,
        due_at,
        source: project_id ? "manual" : "inbox",
      });
      pushToast(project_id ? "Task dibuat ✓" : "Masuk Inbox ✓");
    } else {
      addIdea({
        title: trimmed,
        body: body.trim() || null,
        link: link.trim() || null,
        image_path: imagePath,
        project_id,
      });
      pushToast("Ide tersimpan ✓");
    }
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-6">
        <SheetHeader className="gap-3">
          <SheetTitle className="font-serif text-lg font-medium">Capture</SheetTitle>
          <div className="flex rounded-lg border border-border p-0.5">
            {(["task", "idea"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1.5 text-[12px] font-bold ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "task" ? "Task" : "Idea"}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cap-title">Judul</Label>
            <Input
              id="cap-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === "task" ? "Apa yang perlu dikerjakan?" : "Ide apa?"}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cap-body">{mode === "task" ? "Catatan" : "Body"}</Label>
            <Textarea id="cap-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cap-link">Link</Label>
            <Input
              id="cap-link"
              placeholder="https://…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Gambar (opsional)</Label>
            {imagePath && (
              <div className="relative">
                <AttachmentImage
                  path={imagePath}
                  className="h-[100px] w-full rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  className="absolute top-1.5 right-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white"
                  onClick={() => setImagePath(null)}
                >
                  Hapus
                </button>
              </div>
            )}
            <label className="cursor-pointer rounded-md border border-dashed border-faint px-3 py-2 text-center text-[11.5px] font-semibold text-muted-foreground">
              {uploading ? "Mengunggah…" : "+ Gambar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={onPickImage}
              />
            </label>
          </div>

          <div className={mode === "task" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-1.5"}>
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Select
                value={projectId}
                onValueChange={(v) => setProjectId(v ?? NONE)}
                items={[
                  { value: NONE, label: mode === "task" ? "Inbox (tanpa project)" : "Belum di-assign" },
                  ...dataset.projects.map((p) => ({ value: p.id, label: p.name })),
                ]}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    {mode === "task" ? "Inbox (tanpa project)" : "Belum di-assign"}
                  </SelectItem>
                  {dataset.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mode === "task" && (
              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority((v ?? "medium") as Priority)}
                  items={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {mode === "task" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-due-date">Tanggal due</Label>
                <Input
                  id="cap-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-due-time">Jam (opsional)</Label>
                <Input
                  id="cap-due-time"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button className="mt-1" onClick={submit} disabled={!title.trim() || uploading}>
            {mode === "task" ? "Simpan Task" : "Simpan Ide"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
