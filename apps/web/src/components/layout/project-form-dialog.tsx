"use client";

import { useState } from "react";
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
import { useAppState } from "@/lib/app-state";
import type { ProjectType } from "@/lib/types";

const COLORS = ["#2F4A3E", "#44518A", "#7A4634", "#B08948", "#3E5C73", "#8B8578", "#B4552D", "#5C7A6E"];

export function ProjectFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addProject, pushToast } = useAppState();
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("brand");
  const [color, setColor] = useState(COLORS[0]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addProject({ name: trimmed, type, color });
    pushToast("Project dibuat.");
    setName("");
    setType("brand");
    setColor(COLORS[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Project Baru</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Nama</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipe</Label>
            <Select
              value={type}
              onValueChange={(v) => setType((v ?? "brand") as ProjectType)}
              items={[
                { value: "brand", label: "Brand" },
                { value: "content", label: "Content" },
                { value: "learning", label: "Learning" },
                { value: "personal", label: "Personal" },
              ]}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full ring-offset-2"
                  style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit}>Buat Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
