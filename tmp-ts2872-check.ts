const isActive = true as boolean
const isDisabled = false as boolean
export const className = `px-6 py-3 rounded-lg font-semibold transition focus:ring-2 focus:ring-blue-300 focus:outline-none ${isActive
                ? "hover:bg-blue-500 hover:text-white hover:scale-105"
                : "hover:bg-zinc-700 hover:text-zinc-200"} ${(isDisabled && "disabled:opacity-40 disabled:cursor-not-allowed") || ''}`
