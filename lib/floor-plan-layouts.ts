export type TableLocation = "T" | "I" | "C" | "H" | "O" | "B"

export type FloorPlanZoneLayout = {
  columns?: {
    mobile: number
    desktop: number
  }
  aspect?: "square" | "rect"
}

export type FloorPlanZone = {
  id: string
  title: string
  locations: TableLocation[]
  layout?: FloorPlanZoneLayout
}

export type FloorPlanLayoutId = "base_list" | "zones" | "compact" | string

export type FloorPlanLayout = {
  id: FloorPlanLayoutId
  label: string
  description: string
  zones: FloorPlanZone[]
}

export const DEFAULT_FLOOR_PLAN_LAYOUT: FloorPlanLayoutId = "base_list"

export const FLOOR_PLAN_LAYOUTS: FloorPlanLayout[] = [
  {
    id: "base_list",
    label: "Liste base",
    description: "Disposition actuelle",
    zones: [
      {
        id: "terrace_top",
        title: "Terrasse",
        locations: ["T"],
        layout: { columns: { mobile: 4, desktop: 8 }, aspect: "square" },
      },
      {
        id: "canape",
        title: "Canape",
        locations: ["C"],
        layout: { columns: { mobile: 2, desktop: 2 }, aspect: "rect" },
      },
      {
        id: "terrace_middle",
        title: "Terrasse (suite)",
        locations: ["T"],
        layout: { columns: { mobile: 2, desktop: 4 }, aspect: "square" },
      },
      {
        id: "interior",
        title: "Interieur",
        locations: ["I"],
        layout: { columns: { mobile: 4, desktop: 8 }, aspect: "square" },
      },
      {
        id: "table_hote",
        title: "Table d'Hote",
        locations: ["H"],
        layout: { columns: { mobile: 2, desktop: 4 }, aspect: "rect" },
      },
    ],
  },
  {
    id: "zones",
    label: "Zones",
    description: "Terrasse + Interieur + Canape + Table d'Hote",
    zones: [
      {
        id: "terrace",
        title: "Terrasse",
        locations: ["T"],
        layout: { columns: { mobile: 4, desktop: 8 }, aspect: "square" },
      },
      {
        id: "interior",
        title: "Interieur",
        locations: ["I"],
        layout: { columns: { mobile: 3, desktop: 6 }, aspect: "square" },
      },
      {
        id: "canape",
        title: "Canape",
        locations: ["C"],
        layout: { columns: { mobile: 2, desktop: 4 }, aspect: "rect" },
      },
      {
        id: "table_hote",
        title: "Table d'Hote",
        locations: ["H"],
        layout: { columns: { mobile: 2, desktop: 4 }, aspect: "rect" },
      },
    ],
  },
  {
    id: "compact",
    label: "Compact",
    description: "Vue rapide en colonnes",
    zones: [
      {
        id: "terrace",
        title: "Terrasse",
        locations: ["T"],
        layout: { columns: { mobile: 4, desktop: 6 }, aspect: "square" },
      },
      {
        id: "interior",
        title: "Interieur",
        locations: ["I"],
        layout: { columns: { mobile: 4, desktop: 6 }, aspect: "square" },
      },
      {
        id: "canape",
        title: "Canape",
        locations: ["C"],
        layout: { columns: { mobile: 2, desktop: 4 }, aspect: "rect" },
      },
      {
        id: "table_hote",
        title: "Table d'Hote",
        locations: ["H"],
        layout: { columns: { mobile: 2, desktop: 4 }, aspect: "rect" },
      },
    ],
  },
]

export const isFloorPlanLayoutId = (value: string): boolean =>
  FLOOR_PLAN_LAYOUTS.some((layout) => layout.id === value)

export const isTableLocation = (value: string): value is TableLocation =>
  value === "T" || value === "I" || value === "C" || value === "H" || value === "O" || value === "B"

// ─── Visual floor plan types (2D canvas editor) ───

export type VisualFloorPlanItem = {
  id: string
  type: "table" | "decoration"
  x: number      // percentage of canvas width (0-100)
  y: number      // percentage of canvas height (0-100)
  width: number   // percentage of canvas width
  height: number  // percentage of canvas height
  rotation?: number
  shape?: "rect" | "round" // default: rect
  // Table-specific
  tableId?: string   // UUID of the table in DB
  // Decoration-specific
  label?: string
  color?: string
}

export type VisualFloorPlan = {
  id: string
  label: string
  items: VisualFloorPlanItem[]
}

export type UserFloorPlanAssignments = {
  assignments: Record<string, string> // userId → visual layout id
  default_layout: string              // fallback layout id (grid-based or visual)
}