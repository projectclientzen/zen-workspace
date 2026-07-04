import type { Project } from "@/lib/types";

// Seed 8 project — cocok dengan BE_Tasks_Personal_Dashboard.md DATA-2
export const MOCK_PROJECTS: Project[] = [
  { id: "p1", name: "ngajigaes.id", type: "brand", color: "#2F4A3E", is_active: true, sort_order: 0 },
  { id: "p2", name: "Labbaika", type: "brand", color: "#44518A", is_active: true, sort_order: 1 },
  { id: "p3", name: "Alaikahabibi", type: "brand", color: "#7A4634", is_active: true, sort_order: 2 },
  { id: "p4", name: "Shaleeha Journey", type: "personal", color: "#B08948", is_active: true, sort_order: 3 },
  { id: "p5", name: "MediaPondok Jatim", type: "brand", color: "#3E5C73", is_active: true, sort_order: 4 },
  { id: "p6", name: "PauseProject.id", type: "personal", color: "#8B8578", is_active: true, sort_order: 5 },
  { id: "p7", name: "Ngonten Kopi", type: "content", color: "#B4552D", is_active: true, sort_order: 6 },
  { id: "p8", name: "Belajar AI", type: "learning", color: "#5C7A6E", is_active: true, sort_order: 7 },
];
