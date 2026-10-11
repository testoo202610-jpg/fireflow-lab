import { openDB, type DBSchema } from "idb";
import {
  projectSchema,
  newId,
  hydraulicSignature,
  type Project,
} from "../types/network";
interface FireDB extends DBSchema {
  projects: { key: string; value: Project };
  preferences: { key: string; value: string };
}
const db = () =>
  openDB<FireDB>("fireflow-lab", 1, {
    upgrade(db) {
      db.createObjectStore("projects", { keyPath: "id" });
      db.createObjectStore("preferences");
    },
  });
export async function saveProject(p: Project) {
  const database = await db();
  const checked = projectSchema.parse(p);
  checked.updatedAt = new Date().toISOString();
  await database.put("projects", checked);
  await database.put("preferences", p.id, "active");
  return checked;
}
export async function listProjects() {
  return (await (await db()).getAll("projects")).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
export async function loadProject(id: string) {
  const p = await (await db()).get("projects", id);
  return p ? parseProject(JSON.stringify(p)) : null;
}
export async function restoreActive() {
  const database = await db();
  const id = await database.get("preferences", "active");
  return id ? loadProject(id) : null;
}
export async function deleteProject(id: string) {
  await (await db()).delete("projects", id);
}
export function duplicateProject(p: Project): Project {
  const now = new Date().toISOString();
  return {
    ...structuredClone(p),
    id: newId("P"),
    name: `${p.name} (copy)`,
    createdAt: now,
    updatedAt: now,
  };
}
export function parseProject(json: string): Project {
  if (json.length > 15_000_000)
    throw new Error("Project exceeds 15 MB / الملف أكبر من 15 MB");
  const parsed = projectSchema.safeParse(JSON.parse(json));
  if (!parsed.success)
    throw new Error(
      "Invalid FireFlow schema v1 / ملف المشروع أو نسخة المخطط غير صالحة: " +
        parsed.error.issues
          .slice(0, 3)
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
    );
  const p = parsed.data;
  if (
    p.lastResult &&
    (p.lastResult.signature !== hydraulicSignature(p) ||
      p.lastResult.signature !== hydraulicSignature(p.lastResult.input))
  )
    p.lastResult = null;
  for (const s of p.scenarios)
    if (
      s.result &&
      (s.result.signature !== hydraulicSignature(s.input) ||
        s.result.signature !== hydraulicSignature(s.result.input))
    )
      s.result = null;
  return p;
}
export const exportProject = (p: Project) =>
  JSON.stringify(projectSchema.parse(p), null, 2);
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
