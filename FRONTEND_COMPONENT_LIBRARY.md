# FlowReach AI — Frontend Component Library

> A reference guide for building consistent, reusable UI components across the entire application.
> Every component follows the same design system — light theme, indigo primary, zinc neutrals.

---

## Core Principles

- **Composable** — Small components combine into larger ones. Never build a monolith.
- **Consistent** — Same props pattern across similar components.
- **Stateless where possible** — UI components only render; logic lives in hooks and services.
- **Tailwind only** — No inline styles, no CSS modules, no styled-components.

---

## 1. Button

**File:** `src/components/ui/Button.jsx`

### Variants

| Variant     | Style                                                          |
|-------------|----------------------------------------------------------------|
| `primary`   | `bg-indigo-600 text-white hover:bg-indigo-700`                |
| `secondary` | `border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50` |
| `danger`    | `border border-red-300 text-red-600 hover:bg-red-50`          |
| `ghost`     | `text-zinc-600 hover:bg-zinc-100`                             |
| `link`      | `text-indigo-600 underline-offset-2 hover:underline`          |

### Sizes

| Size  | Style                   |
|-------|-------------------------|
| `sm`  | `text-xs px-3 py-1.5`   |
| `md`  | `text-sm px-4 py-2`     |
| `lg`  | `text-base px-5 py-2.5` |

### Props

```jsx
<Button
  variant="primary"     // primary | secondary | danger | ghost | link
  size="md"             // sm | md | lg
  disabled={false}
  loading={false}       // shows spinner, disables click
  icon={<Icon />}       // optional lucide icon on left
  onClick={() => {}}
>
  Save Workflow
</Button>
```

### Implementation

```jsx
import { Loader2 } from "lucide-react"

const variants = {
  primary:   "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50",
  secondary: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
  danger:    "border border-red-300 text-red-600 hover:bg-red-50",
  ghost:     "text-zinc-600 hover:bg-zinc-100",
  link:      "text-indigo-600 hover:underline underline-offset-2 p-0",
}

const sizes = {
  sm: "text-xs px-3 py-1.5 rounded-lg",
  md: "text-sm px-4 py-2 rounded-lg",
  lg: "text-base px-5 py-2.5 rounded-xl",
}

export default function Button({
  children, variant = "primary", size = "md",
  disabled, loading, icon, onClick, className = ""
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 font-medium transition-all duration-150
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
```

---

## 2. Card

**File:** `src/components/ui/Card.jsx`

Cards are the primary container for content blocks throughout the app.

### Variants

| Variant   | Use Case                            |
|-----------|-------------------------------------|
| `default` | Standard content card               |
| `stat`    | Metric display on dashboard         |
| `flat`    | No shadow, just border              |

### Implementation

```jsx
const variants = {
  default: "bg-white border border-zinc-200 rounded-xl shadow-sm",
  stat:    "bg-white border border-zinc-200 rounded-xl shadow-sm hover:shadow-md transition-shadow",
  flat:    "bg-white border border-zinc-200 rounded-xl",
}

export function Card({ children, variant = "default", className = "" }) {
  return (
    <div className={`${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={`px-5 pt-5 pb-3 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children }) {
  return <h3 className="text-sm font-semibold text-zinc-700">{children}</h3>
}

export function CardBody({ children, className = "" }) {
  return (
    <div className={`px-5 pb-5 ${className}`}>
      {children}
    </div>
  )
}
```

### Usage

```jsx
<Card variant="stat" className="p-5">
  <CardTitle>Total Leads</CardTitle>
  <p className="text-3xl font-bold text-zinc-900 mt-1">1,240</p>
  <p className="text-xs text-zinc-400 mt-1">Updated live</p>
</Card>
```

---

## 3. Badge

**File:** `src/components/ui/Badge.jsx`

Used for status labels, tags, and indicators.

### Color Map

| Color     | Classes                               |
|-----------|---------------------------------------|
| `indigo`  | `bg-indigo-100 text-indigo-700`       |
| `green`   | `bg-green-100 text-green-700`         |
| `yellow`  | `bg-yellow-100 text-yellow-700`       |
| `red`     | `bg-red-100 text-red-700`             |
| `blue`    | `bg-blue-100 text-blue-700`           |
| `zinc`    | `bg-zinc-100 text-zinc-600`           |
| `violet`  | `bg-violet-100 text-violet-700`       |

### Lead Status → Badge Color

```
new          → blue
contacted    → yellow
replied      → green
converted    → indigo
unsubscribed → red
```

### Implementation

```jsx
const colors = {
  indigo: "bg-indigo-100 text-indigo-700",
  green:  "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red:    "bg-red-100 text-red-700",
  blue:   "bg-blue-100 text-blue-700",
  zinc:   "bg-zinc-100 text-zinc-600",
  violet: "bg-violet-100 text-violet-700",
}

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

export default function Badge({ label, color = "zinc", dot = false }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5
      text-xs font-medium rounded-full ${colors[color]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  )
}
```

---

## 4. Input

**File:** `src/components/ui/Input.jsx`

### Variants

| Variant   | Use                    |
|-----------|------------------------|
| `default` | Standard text input    |
| `search`  | Has search icon prefix |

### Implementation

```jsx
import { Search } from "lucide-react"

export default function Input({
  label, placeholder, value, onChange,
  type = "text", error, required, className = ""
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-zinc-600">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`h-9 px-3 text-sm bg-white border rounded-lg outline-none
          transition-all duration-150 placeholder:text-zinc-400
          ${error
            ? "border-red-400 focus:ring-2 focus:ring-red-100"
            : "border-zinc-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
          } ${className}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-9 pl-9 pr-3 text-sm bg-white border border-zinc-200 rounded-lg
          outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50
          placeholder:text-zinc-400 transition-all duration-150"
      />
    </div>
  )
}
```

---

## 5. Select

**File:** `src/components/ui/Select.jsx`

```jsx
export default function Select({ label, value, onChange, options = [], placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-zinc-600">{label}</label>
      )}
      <select
        value={value}
        onChange={onChange}
        className="h-9 px-3 text-sm bg-white border border-zinc-200 rounded-lg
          outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50
          text-zinc-700 transition-all duration-150 cursor-pointer"
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
```

---

## 6. Modal

**File:** `src/components/ui/Modal.jsx`

```jsx
import { X } from "lucide-react"
import { useEffect } from "react"

export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm:  "max-w-md",
    md:  "max-w-2xl",
    lg:  "max-w-4xl",
    xl:  "max-w-6xl",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizes[size]}
          max-h-[80vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600
              transition-all duration-150">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
```

---

## 7. Skeleton

**File:** `src/components/ui/Skeleton.jsx`

```jsx
export function Skeleton({ className = "" }) {
  return (
    <div className={`animate-pulse bg-zinc-200 rounded-md ${className}`} />
  )
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-3/5" : "w-full"}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-3 w-full" />
        </td>
      ))}
    </tr>
  )
}
```

---

## 8. Table

**File:** `src/components/ui/Table.jsx`

```jsx
export function Table({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  )
}

export function TableHead({ columns = [] }) {
  return (
    <thead className="bg-zinc-50 border-b border-zinc-200">
      <tr>
        {columns.map((col, i) => (
          <th key={i}
            className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function TableRow({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-zinc-100 even:bg-zinc-50/50
        ${onClick ? "cursor-pointer hover:bg-indigo-50/30" : "hover:bg-zinc-50"}
        transition-colors duration-100`}
    >
      {children}
    </tr>
  )
}

export function TableCell({ children, className = "" }) {
  return (
    <td className={`px-4 py-3 text-zinc-700 ${className}`}>
      {children}
    </td>
  )
}
```

---

## 9. Tabs

**File:** `src/components/ui/Tabs.jsx`

```jsx
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div className="flex border-b border-zinc-200 gap-1">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2.5 text-sm font-medium transition-all duration-150
            ${active === tab.value
              ? "text-indigo-700 border-b-2 border-indigo-600 -mb-px"
              : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 rounded-t-lg"
            }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full
              ${active === tab.value
                ? "bg-indigo-100 text-indigo-600"
                : "bg-zinc-100 text-zinc-500"}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
```

### Usage

```jsx
const [tab, setTab] = useState("leads")

<Tabs
  tabs={[
    { value: "leads",  label: "All Leads",     count: 50 },
    { value: "import", label: "Import Leads" },
  ]}
  active={tab}
  onChange={setTab}
/>
```

---

## 10. StatCard

**File:** `src/components/dashboard/StatCard.jsx`

```jsx
export default function StatCard({ icon: Icon, iconColor, value, label, trend }) {
  const iconBg = {
    indigo: "bg-indigo-100 text-indigo-600",
    green:  "bg-green-100 text-green-600",
    violet: "bg-violet-100 text-violet-600",
    orange: "bg-orange-100 text-orange-600",
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm
      hover:shadow-md transition-shadow duration-200">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4
        ${iconBg[iconColor] || iconBg.indigo}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-sm text-zinc-500 mt-0.5">{label}</p>
      {trend && (
        <p className="text-xs text-zinc-400 mt-2">{trend}</p>
      )}
    </div>
  )
}
```

---

## 11. Empty State

**File:** `src/components/ui/EmptyState.jsx`

```jsx
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-zinc-400" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-400 mb-5 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  )
}
```

### Usage

```jsx
<EmptyState
  icon={Users}
  title="No leads yet"
  description="Import a CSV or Excel file to get started with outreach."
  action={
    <Button variant="primary" onClick={() => setTab("import")}>
      Import Leads
    </Button>
  }
/>
```

---

## 12. Progress Bar

**File:** `src/components/ui/ProgressBar.jsx`

```jsx
export default function ProgressBar({ value, max, label, showPercent = true }) {
  const pct = Math.min(100, Math.round((value / max) * 100))

  const color = pct >= 95
    ? "bg-red-500"
    : pct >= 80
    ? "bg-amber-400"
    : "bg-indigo-500"

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-zinc-600">{label}</span>
          {showPercent && (
            <span className="text-xs text-zinc-400">{value} / {max}</span>
          )}
        </div>
      )}
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

---

## 13. Confirm Dialog

**File:** `src/components/ui/ConfirmDialog.jsx`

Used before destructive actions like deleting a workflow or removing from blacklist.

```jsx
import Modal from "./Modal"
import Button from "./Button"

export default function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  variant = "danger"
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-zinc-500 mb-6">{description}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
```

---

## 14. Section Header

**File:** `src/components/ui/SectionHeader.jsx`

Used as the title block for settings sections, page sections, and card headers.

```jsx
export default function SectionHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center mt-0.5">
            <Icon className="w-4 h-4 text-indigo-600" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description && (
            <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}
```

---

## 15. Toggle Switch

**File:** `src/components/ui/Toggle.jsx`

```jsx
export default function Toggle({ enabled, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        {label && <p className="text-sm font-medium text-zinc-700">{label}</p>}
        {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-10 h-6 rounded-full transition-colors duration-200 relative
          ${enabled ? "bg-indigo-600" : "bg-zinc-200"}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow
          transition-transform duration-200
          ${enabled ? "translate-x-5" : "translate-x-1"}`}
        />
      </button>
    </div>
  )
}
```

---

## Hooks

### `useApi` — Data Fetching

**File:** `src/hooks/useApi.js`

```js
import { useState, useEffect, useCallback } from "react"

export function useApi(fetchFn, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchFn()
      setData(res.data)
    } catch (err) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
```

### Usage

```jsx
import { useApi } from "@/hooks/useApi"
import { getLeads } from "@/services/api"

const { data: leads, loading, error, refetch } = useApi(getLeads)
```

---

### `useSocket` — Real-time Events

**File:** `src/hooks/useSocket.js`

```js
import { useEffect, useRef } from "react"
import { socket } from "@/services/socket"

export function useSocket(events = {}) {
  const handlersRef = useRef(events)
  handlersRef.current = events

  useEffect(() => {
    const entries = Object.entries(handlersRef.current)
    entries.forEach(([event, handler]) => socket.on(event, handler))
    return () => {
      entries.forEach(([event, handler]) => socket.off(event, handler))
    }
  }, [])
}
```

### Usage

```jsx
useSocket({
  "execution:log":      (data) => addEvent({ ...data, type: "info" }),
  "node:complete":      (data) => addEvent({ ...data, type: "complete" }),
  "execution:complete": (data) => addEvent({ ...data, type: "success" }),
  "execution:error":    (data) => addEvent({ ...data, type: "error" }),
})
```

---

## Component Index

Quick lookup for all components and their locations.

| Component        | File                                      | Used On              |
|------------------|-------------------------------------------|----------------------|
| Button           | `ui/Button.jsx`                           | Everywhere           |
| Card             | `ui/Card.jsx`                             | Dashboard, Settings  |
| Badge            | `ui/Badge.jsx`                            | Leads, Executions    |
| Input            | `ui/Input.jsx`                            | Forms, Search        |
| Select           | `ui/Select.jsx`                           | Workflow Config      |
| Modal            | `ui/Modal.jsx`                            | AI Preview, Confirm  |
| Skeleton         | `ui/Skeleton.jsx`                         | All loading states   |
| Table            | `ui/Table.jsx`                            | Leads, Executions    |
| Tabs             | `ui/Tabs.jsx`                             | Leads, Executions    |
| StatCard         | `dashboard/StatCard.jsx`                  | Dashboard            |
| EmptyState       | `ui/EmptyState.jsx`                       | All list pages       |
| ProgressBar      | `ui/ProgressBar.jsx`                      | Settings             |
| ConfirmDialog    | `ui/ConfirmDialog.jsx`                    | Delete actions       |
| SectionHeader    | `ui/SectionHeader.jsx`                    | Settings             |
| Toggle           | `ui/Toggle.jsx`                           | Settings             |
| useApi           | `hooks/useApi.js`                         | All data fetches     |
| useSocket        | `hooks/useSocket.js`                      | Executions live feed |

---

## Do's and Don'ts

### ✅ Do

- Import from the component library above for every repeated pattern
- Use `useApi` hook for all data fetching — never fetch inside JSX render
- Pass loading and error states down as props to keep components testable
- Use `Badge` with `statusColors` map for all status displays
- Show `SkeletonCard` or `SkeletonRow` during every loading state
- Use `ConfirmDialog` before any delete or destructive action
- Keep page files thin — logic in hooks, UI in components

### ❌ Don't

- Don't call `axios` directly in page or component files — use `services/api.js`
- Don't use hardcoded hex colors — use Tailwind color classes only
- Don't build one-off buttons or inputs — always reuse `Button` and `Input`
- Don't add `margin` to components from inside — let the parent control spacing
- Don't use `useEffect` for data fetching — use `useApi` hook instead
- Don't leave `console.log` in components before handing off

---

*FlowReach AI Component Library — Build once. Use everywhere. Ship fast. 🚀*
