import { useState, type ReactNode } from 'react'

/** Builds a class string from an object map (exercises nested-brace rewrites). */
function cn(map: Record<string, boolean | undefined>): string {
  return Object.entries(map)
    .filter(([, on]) => Boolean(on))
    .map(([cls]) => cls)
    .join(' ')
}

type Status = 'active' | 'muted' | 'danger'

function App() {
  const [isActive, setIsActive] = useState(true)
  const [isDisabled, setIsDisabled] = useState(false)
  const [status, setStatus] = useState<Status>('active')
  const [kind, setKind] = useState('primary')

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
        <p className="max-w-xl text-sm text-zinc-400">
          Prefer <code className="text-zinc-200">className:hover</code> over
          attributify. UseClassy rewrites source before Uno’s Vite pipeline;
          the HTML manifest is a filesystem backstop. Chained modifiers are
          additive — not Uno variant composition.
        </p>
      </header>

      <section
        className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-300"
        className:md="gap-6"
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={event => setIsActive(event.target.checked)}
          />
          isActive
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={event => setIsDisabled(event.target.checked)}
          />
          isDisabled
        </label>
        <label className="flex items-center gap-2">
          status
          <select
            className="rounded bg-zinc-900 border border-zinc-700 px-2 py-1"
            value={status}
            onChange={event => setStatus(event.target.value as Status)}
          >
            <option value="active">active</option>
            <option value="muted">muted</option>
            <option value="danger">danger</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          kind
          <select
            className="rounded bg-zinc-900 border border-zinc-700 px-2 py-1"
            value={kind}
            onChange={event => setKind(event.target.value)}
          >
            <option value="primary">primary</option>
            <option value="secondary">secondary</option>
          </select>
        </label>
      </section>

      <div
        className="w-full max-w-3xl flex flex-col gap-8"
        className:md="gap-10"
      >
        <Case title="Quoted modifiers">
          <div
            className="text-2xl text-sky-500"
            className:hover="text-emerald-400"
            className:md="text-4xl"
          >
            Hover me · resize for md
          </div>
        </Case>

        <Case title="Boolean ternary + && + focus">
          <button
            type="button"
            disabled={isDisabled}
            className="px-6 py-3 rounded-lg font-semibold transition bg-zinc-800"
            className:hover={
              isActive
                ? 'bg-sky-500 text-white scale-105'
                : 'bg-zinc-700 text-zinc-200'
            }
            className:disabled={isDisabled && 'opacity-40 cursor-not-allowed'}
            className:focus="ring-2 ring-sky-300 outline-none"
            onClick={() => setIsActive(value => !value)}
          >
            {isActive ? 'Active hover styles' : 'Muted hover styles'}
          </button>
        </Case>

        <Case
          title="Comparison string operands"
          detail="Comparison literals must stay unprefixed (not hover:active)."
        >
          <button
            type="button"
            className="px-6 py-3 rounded-lg font-semibold transition border border-zinc-700"
            className:hover={
              status === 'active'
                ? 'bg-emerald-500 text-white'
                : status === 'danger'
                  ? 'bg-red-500 text-white'
                  : 'bg-zinc-700 text-zinc-200'
            }
            className:focus="ring-2 ring-emerald-300 outline-none"
            onClick={() =>
              setStatus(current =>
                current === 'active'
                  ? 'muted'
                  : current === 'muted'
                    ? 'danger'
                    : 'active',
              )
            }
          >
            status === &apos;{status}&apos; (click to cycle)
          </button>
        </Case>

        <Case
          title="String method receiver"
          detail="Method receivers like 'primary'.includes(kind) stay bare."
        >
          <div
            className="px-5 py-3 rounded-lg border border-zinc-700"
            className:hover={
              'primary'.includes(kind)
                ? 'bg-indigo-500 text-white'
                : 'bg-zinc-800 text-zinc-300'
            }
            className:sm="text-lg"
          >
            kind=&quot;{kind}&quot; →{' '}
            {'primary'.includes(kind) ? 'primary branch' : 'fallback branch'}
          </div>
        </Case>

        <Case
          title="Additive chain"
          detail='className:sm:hover="underline" emits sm:hover:underline + sm:underline + hover:underline. Underline on hover at any width, at sm without hover, and at sm+hover.'
        >
          <p
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 text-zinc-100"
            className:sm:hover="underline"
          >
            Resize below/above sm, then hover.
          </p>
        </Case>

        <Case
          title="Exact chain on className"
          detail="Leave sm:hover:underline on the base string to match Uno/Tailwind: underline only when sm AND hover."
        >
          <p className="sm:hover:underline rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3 text-zinc-100">
            Same resize/hover — underline only at sm + hover.
          </p>
        </Case>

        <Case
          title="Nested modifiers (also additive)"
          detail="className:sm:hover and className:lg:focus-within each expand the full chain plus each segment."
        >
          <div
            className="px-5 py-3 rounded-lg bg-zinc-900"
            className:sm:hover={
              isActive ? 'text-lg text-sky-300' : 'text-sm text-zinc-400'
            }
            className:lg:focus-within="ring-2 ring-sky-400"
          >
            sm:hover + lg:focus-within — tab or hover at breakpoints
            <input
              className="mt-2 block w-full rounded bg-zinc-950 border border-zinc-700 px-2 py-1 text-sm"
              placeholder="focus within"
            />
          </div>
        </Case>

        <Case title="Nested braces (cn object map)">
          <div
            className="px-5 py-3 rounded-lg border border-zinc-700"
            className:hover={cn({
              'bg-sky-500 text-white': status === 'active',
              'bg-red-500 text-white': status === 'danger',
              'bg-zinc-700 text-zinc-200': status === 'muted',
            })}
            className:active="scale-95"
          >
            cn map keyed by status
          </div>
        </Case>

        <Case
          title="Mixed static + dual conditionals"
          detail="className:sm:hover=&quot;underline&quot; on this button is additive, same as the case above."
        >
          <button
            type="button"
            disabled={isDisabled}
            className="px-4 py-2 rounded font-medium border border-zinc-600"
            className:hover={
              status !== 'muted' ? 'bg-violet-600 text-white' : 'bg-zinc-800'
            }
            className:disabled={isDisabled && 'opacity-50 cursor-not-allowed'}
            className:sm:hover="underline"
            onClick={() => setIsDisabled(value => !value)}
          >
            Toggle disabled from button
          </button>
        </Case>

        <Case title="Group / peer variants">
          <div
            className="group flex flex-col gap-3 rounded-lg border border-zinc-700 p-4"
            className:hover="border-sky-500"
          >
            <p
              className="text-sm text-zinc-400"
              className:group-hover="text-sky-300"
            >
              group-hover text
            </p>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              peer input
              <input
                className="peer rounded bg-zinc-950 border border-zinc-700 px-2 py-1 text-sm text-zinc-100"
                className:focus="border-sky-400 outline-none"
                placeholder="focus me"
              />
              <span
                className="text-zinc-600"
                className:peer-focus="text-sky-400"
              >
                peer-focus hint
              </span>
            </label>
          </div>
        </Case>
      </div>
    </div>
  )
}

function Case({
  title,
  detail,
  children,
}: {
  title: string
  detail?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        {detail ? <p className="text-xs text-zinc-500">{detail}</p> : null}
      </div>
      {children}
    </section>
  )
}

export default App
