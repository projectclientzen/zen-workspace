"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentImage } from "@/components/common/attachment-image";
import { useAppState } from "@/lib/app-state";
import { uploadAttachment } from "@/lib/supabase/storage";

const NONE = "__none__";

const schema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi"),
  notes: z.string().optional(),
  link: z.string().optional(),
  project_id: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  recurring_rule_id: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function TaskFormDialog() {
  const { dataset, taskForm, closeTaskForm, addTask, updateTask, pushToast } = useAppState();
  const editing = taskForm.taskId ? dataset.tasks.find((t) => t.id === taskForm.taskId) : null;
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      notes: "",
      link: "",
      project_id: taskForm.defaultProjectId ?? NONE,
      priority: "medium",
      due_date: "",
      due_time: "",
      recurring_rule_id: NONE,
    },
  });

  useEffect(() => {
    if (!taskForm.open) return;
    if (editing) {
      const due = editing.due_at ? new Date(editing.due_at) : null;
      reset({
        title: editing.title,
        notes: editing.notes ?? "",
        link: editing.link ?? "",
        project_id: editing.project_id ?? NONE,
        priority: editing.priority,
        due_date: due ? due.toISOString().slice(0, 10) : "",
        due_time: due ? due.toISOString().slice(11, 16) : "",
        recurring_rule_id: editing.recurring_rule_id ?? NONE,
      });
      setImagePath(editing.image_path ?? null);
    } else {
      reset({
        title: "",
        notes: "",
        link: "",
        project_id: taskForm.defaultProjectId ?? NONE,
        priority: "medium",
        due_date: "",
        due_time: "",
        recurring_rule_id: NONE,
      });
      setImagePath(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskForm.open, taskForm.taskId]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadAttachment(file, "tasks");
      setImagePath(path);
    } catch (err) {
      console.error(err);
      pushToast("Gagal upload gambar.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (values: FormValues) => {
    let due_at: string | null = null;
    if (values.due_date) {
      const time = values.due_time || "17:00";
      due_at = new Date(`${values.due_date}T${time}:00`).toISOString();
    }
    const project_id = values.project_id === NONE ? null : values.project_id;
    const recurring_rule_id = values.recurring_rule_id === NONE ? null : values.recurring_rule_id;

    const payload = {
      title: values.title.trim(),
      notes: values.notes?.trim() || null,
      link: values.link?.trim() || null,
      image_path: imagePath,
      project_id,
      priority: values.priority,
      due_at,
      recurring_rule_id,
      source: (recurring_rule_id ? "recurring" : project_id ? "manual" : "inbox") as
        | "manual"
        | "inbox"
        | "recurring",
    };

    if (editing) {
      updateTask(editing.id, payload);
      pushToast("Task diperbarui.");
    } else {
      addTask(payload);
      pushToast("Task dibuat.");
    }
    closeTaskForm();
  };

  const projectId = watch("project_id");

  return (
    <Dialog open={taskForm.open} onOpenChange={(open) => !open && closeTaskForm()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Task" : "Task Baru"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" {...register("title")} autoFocus />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link">Link</Label>
            <Input id="link" placeholder="https://…" {...register("link")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Gambar (opsional)</Label>
            {imagePath && (
              <div className="relative">
                <AttachmentImage
                  path={imagePath}
                  className="h-[120px] w-full rounded-md border border-border object-cover"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={(v) => setValue("project_id", v ?? NONE)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Inbox (tanpa project)</SelectItem>
                  {dataset.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v as FormValues["priority"])}>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due_date">Tanggal due</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="due_time">Jam (opsional)</Label>
              <Input id="due_time" type="time" {...register("due_time")} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Recurring (opsional)</Label>
            <Select
              value={watch("recurring_rule_id")}
              onValueChange={(v) => setValue("recurring_rule_id", v ?? NONE)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Bukan recurring</SelectItem>
                {dataset.recurringRules
                  .filter((r) => r.is_active)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title_template}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" onClick={closeTaskForm}>
              Batal
            </Button>
            <Button type="submit">{editing ? "Simpan" : "Buat Task"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
