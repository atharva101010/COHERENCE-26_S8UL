import { motion } from "framer-motion"

export default function StatCard({ icon: Icon, iconColor, value, label, trend, trendUp, delay = 0 }) {
  const iconColors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    green:  "bg-green-50 text-green-600 border-green-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    blue:   "bg-blue-50 text-blue-600 border-blue-100",
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white border border-zinc-200/60 rounded-2xl p-6 shadow-sm
        hover:premium-shadow hover:-translate-y-1 transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border
          ${iconColors[iconColor] || iconColors.indigo} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border
            ${trendUp ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"}`}>
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-extrabold text-zinc-900 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-zinc-500 mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  )
}
