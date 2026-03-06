import { Search } from "lucide-react"

export default function Input({
  label, placeholder, value, onChange,
  type = "text", error, required, className = ""
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`h-10 px-4 text-sm bg-white border rounded-xl outline-none
          transition-all duration-200 placeholder:text-zinc-400
          ${error
            ? "border-red-400 focus:ring-4 focus:ring-red-50"
            : "border-zinc-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
          } ${className}`}
      />
      {error && <p className="text-xs text-red-500 font-medium ml-1">{error}</p>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = "Search everything..." }) {
  return (
    <div className="relative group">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-10 pl-10 pr-4 text-sm bg-zinc-100/50 border border-transparent rounded-xl
          outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50
          placeholder:text-zinc-400 transition-all duration-200 w-full sm:w-64"
      />
    </div>
  )
}
