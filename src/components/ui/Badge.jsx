export const statusColors = {
  new:          "blue",
  contacted:    "yellow",
  replied:      "green",
  converted:    "indigo",
  unsubscribed: "red",
  running:      "yellow",
  completed:    "green",
  failed:       "red",
  pending:      "zinc",
}

const colors = {
  indigo:  "bg-indigo-50 text-indigo-700 border-indigo-100",
  green:   "bg-green-50 text-green-700 border-green-100",
  yellow:  "bg-yellow-50 text-yellow-700 border-yellow-100",
  red:     "bg-red-50 text-red-700 border-red-100",
  blue:    "bg-blue-50 text-blue-700 border-blue-100",
  zinc:    "bg-zinc-100 text-zinc-600 border-zinc-200",
  violet:  "bg-violet-50 text-violet-700 border-violet-100",
}

export default function Badge({ label, color = "zinc", dot = false, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5
      text-[11px] font-semibold rounded-full border ${colors[color]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  )
}
