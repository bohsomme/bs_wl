// Shared Functional Fitness definitions used by the program builder and the
// live workout session.

export type FunctionalKind = "metcon" | "zone2" | "mobility" | "custom"

export const FUNCTIONAL_PRESETS: {
  kind: FunctionalKind
  label: string
  defaultSource?: string
  hint: string
}[] = [
  {
    kind: "metcon",
    label: "MetCon",
    defaultSource: "Class Programming",
    hint: "Metabolic conditioning, e.g. from class programming",
  },
  {
    kind: "zone2",
    label: "Zone 2 / Aerobic",
    hint: "Low-intensity steady-state cardio",
  },
  {
    kind: "mobility",
    label: "Mobility / Recovery",
    hint: "Stretching, mobility, active recovery",
  },
  {
    kind: "custom",
    label: "Custom / Specific",
    hint: "Type a specific workout",
  },
]

export function functionalLabel(kind: string): string {
  return FUNCTIONAL_PRESETS.find((p) => p.kind === kind)?.label ?? "Functional"
}

// The heading shown for a block: for custom blocks the user's typed title wins;
// for presets, show the preset label (with an optional custom title appended).
export function functionalHeading(block: { kind: string; title: string | null }): string {
  if (block.kind === "custom") return block.title?.trim() || "Functional work"
  const label = functionalLabel(block.kind)
  return block.title?.trim() ? `${label} — ${block.title.trim()}` : label
}
