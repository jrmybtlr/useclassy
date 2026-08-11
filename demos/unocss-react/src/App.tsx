import { useState } from 'react'

function App() {
  const [isActive, setIsActive] = useState(true)

  return (
    <div
      className="min-h-screen flex flex-col items-center gap-8 px-4 py-12"
      className:md="gap-10 py-16"
    >
      <header className="text-center flex flex-col gap-2">
        <p className="text-sm text-zinc-400 tracking-wide uppercase">
          UseClassy + UnoCSS
        </p>
        <h1
          className="font-bold text-4xl text-zinc-100"
          className:hover="text-sky-400"
          className:md="text-6xl"
        >
          Variant attributes
        </h1>
        <p className="max-w-md text-sm text-zinc-400">
          Prefer <code className="text-zinc-200">className:hover</code> over
          attributify. The manifest feeds Uno via{' '}
          <code className="text-zinc-200">content.filesystem</code>.
        </p>
      </header>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={isActive}
          onChange={event => setIsActive(event.target.checked)}
        />
        isActive
      </label>

      <button
        type="button"
        className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-medium"
        className:hover="bg-sky-500 scale-105"
        className:focus="ring-2 ring-sky-300 ring-offset-2 ring-offset-zinc-950"
        className:disabled="opacity-40 cursor-not-allowed"
        disabled={!isActive}
      >
        Hover me
      </button>

      <button
        type="button"
        className="px-5 py-2.5 rounded-lg border border-zinc-700"
        className:hover={isActive ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-500'}
      >
        Conditional hover
      </button>
    </div>
  )
}

export default App
