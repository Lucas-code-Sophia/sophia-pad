export const MENU_BUTTON_COLORS = [
  {
    value: "blue",
    label: "Bleu",
    swatchClassName: "bg-blue-500",
    cardClassName: "bg-blue-900/40 border-blue-700 hover:bg-blue-900/60",
  },
  {
    value: "emerald",
    label: "Vert",
    swatchClassName: "bg-emerald-500",
    cardClassName: "bg-emerald-900/35 border-emerald-700 hover:bg-emerald-900/55",
  },
  {
    value: "amber",
    label: "Ambre",
    swatchClassName: "bg-amber-500",
    cardClassName: "bg-amber-900/35 border-amber-700 hover:bg-amber-900/55",
  },
  {
    value: "orange",
    label: "Orange",
    swatchClassName: "bg-orange-500",
    cardClassName: "bg-orange-900/35 border-orange-700 hover:bg-orange-900/55",
  },
  {
    value: "red",
    label: "Rouge",
    swatchClassName: "bg-red-500",
    cardClassName: "bg-red-900/40 border-red-700 hover:bg-red-900/60",
  },
  {
    value: "rose",
    label: "Rose",
    swatchClassName: "bg-fuchsia-500",
    cardClassName: "bg-fuchsia-500 border-fuchsia-300 hover:bg-fuchsia-400",
  },
  {
    value: "violet",
    label: "Violet",
    swatchClassName: "bg-violet-500",
    cardClassName: "bg-violet-900/35 border-violet-700 hover:bg-violet-900/55",
  },
  {
    value: "cyan",
    label: "Cyan",
    swatchClassName: "bg-cyan-500",
    cardClassName: "bg-cyan-900/35 border-cyan-700 hover:bg-cyan-900/55",
  },
  {
    value: "white",
    label: "Blanc",
    swatchClassName: "bg-white",
    cardClassName: "bg-white border-slate-300 hover:bg-slate-100",
  },
] as const

export type MenuButtonColorValue = (typeof MENU_BUTTON_COLORS)[number]["value"]

export const normalizeMenuButtonColor = (value?: string | null): MenuButtonColorValue | null => {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  const match = MENU_BUTTON_COLORS.find((color) => color.value === normalized)
  return match ? match.value : null
}

export const getMenuButtonColorClasses = (value?: string | null) => {
  const normalized = normalizeMenuButtonColor(value)
  if (!normalized) return ""
  const match = MENU_BUTTON_COLORS.find((color) => color.value === normalized)
  return match?.cardClassName || ""
}
