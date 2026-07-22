import { useState, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

/** Tiny class-map helper to exercise nested-brace rewrites (`cn({ '…': cond })`). */
function cn(map: Record<string, boolean | undefined>): string {
  return Object.entries(map)
    .filter(([, on]) => Boolean(on))
    .map(([cls]) => cls)
    .join(" ");
}

type Status = "active" | "muted" | "danger";

function App() {
  const [isActive, setIsActive] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);
  const [status, setStatus] = useState<Status>("active");
  const [kind, setKind] = useState("primary");

  return (
    <div
      className="min-h-screen flex flex-col items-center gap-10 px-4 py-10"
      className:md="gap-12 py-16 px-8"
    >
      <header className="flex flex-col items-center gap-3 text-center">
        <h1
          className="font-bold text-4xl"
          className:md="text-7xl text-blue-200"
          className:hover="text-red-500"
        >
          React Demo
        </h1>
        <p className="max-w-xl text-sm text-zinc-400">
          Smoke coverage for quoted modifiers, conditionals, comparison
          operands, nested braces, and multi-modifier merges.
        </p>
      </header>

      {/* Controls */}
      <section
        className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-300"
        className:md="gap-6"
      >
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          isActive
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={(event) => setIsDisabled(event.target.checked)}
          />
          isDisabled
        </label>
        <label className="flex items-center gap-2">
          status
          <select
            className="rounded bg-zinc-900 border border-zinc-700 px-2 py-1"
            value={status}
            onChange={(event) => setStatus(event.target.value as Status)}
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
            onChange={(event) => setKind(event.target.value)}
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
        {/* Quoted static + twMerge */}
        <Case
          title="Quoted modifiers + twMerge"
          detail="className:hover=&quot;…&quot; merged with an existing className expression"
        >
          <div
            className={twMerge("text-2xl text-red-500")}
            className:hover="text-blue-500"
            className:md="text-4xl"
          >
            Hover me · resize for md
          </div>
        </Case>

        {/* Boolean ternary + && + quoted focus */}
        <Case
          title="Boolean ternary + && + quoted focus"
          detail="Multi-modifier merge with falsy coercion on disabled"
        >
          <button
            type="button"
            disabled={isDisabled}
            className="px-6 py-3 rounded-lg font-semibold transition"
            className:hover={
              isActive
                ? "bg-blue-500 text-white scale-105"
                : "bg-zinc-700 text-zinc-200"
            }
            className:disabled={isDisabled && "opacity-40 cursor-not-allowed"}
            className:focus="ring-2 ring-blue-300 outline-none"
            onClick={() => setIsActive((value) => !value)}
          >
            {isActive ? "Active hover styles" : "Muted hover styles"}
          </button>
        </Case>

        {/* Comparison operands must stay unprefixed */}
        <Case
          title="Comparison string operands"
          detail="status === 'active' must not become status === 'hover:active'"
        >
          <button
            type="button"
            className="px-6 py-3 rounded-lg font-semibold transition border border-zinc-700"
            className:hover={
              status === "active"
                ? "bg-emerald-500 text-white"
                : status === "danger"
                  ? "bg-red-500 text-white"
                  : "bg-zinc-700 text-zinc-200"
            }
            className:focus="ring-2 ring-emerald-300 outline-none"
            onClick={() =>
              setStatus((current) =>
                current === "active"
                  ? "muted"
                  : current === "muted"
                    ? "danger"
                    : "active",
              )
            }
          >
            status === &apos;{status}&apos; (click to cycle)
          </button>
        </Case>

        {/* Method receiver left alone */}
        <Case
          title="String method receiver"
          detail="'primary'.includes(kind) must keep the bare 'primary' literal"
        >
          <div
            className="px-5 py-3 rounded-lg border border-zinc-700"
            className:hover={
              "primary".includes(kind)
                ? "bg-indigo-500 text-white"
                : "bg-zinc-800 text-zinc-300"
            }
            className:sm="text-lg"
          >
            kind=&quot;{kind}&quot; →{" "}
            {"primary".includes(kind) ? "primary branch" : "fallback branch"}
          </div>
        </Case>

        {/* Nested modifiers */}
        <Case
          title="Nested modifiers"
          detail="className:sm:hover expands full chain + partials for Tailwind"
        >
          <div
            className="px-5 py-3 rounded-lg bg-zinc-900"
            className:sm:hover={
              isActive ? "text-lg text-sky-300" : "text-sm text-zinc-400"
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

        {/* Nested braces / cn object map */}
        <Case
          title="Nested braces (cn object map)"
          detail="Rewrites string keys inside cn({ … }) without dropping braces"
        >
          <div
            className="px-5 py-3 rounded-lg border border-zinc-700"
            className:hover={cn({
              "bg-blue-500 text-white": status === "active",
              "bg-red-500 text-white": status === "danger",
              "bg-zinc-700 text-zinc-200": status === "muted",
            })}
            className:active="scale-95"
          >
            cn map keyed by status
          </div>
        </Case>

        {/* Mixed static, template-ish merge, and dual conditionals */}
        <Case
          title="Mixed static + dual conditionals"
          detail="Preserves multiple JSX class values when merging"
        >
          <button
            type="button"
            disabled={isDisabled}
            className="px-4 py-2 rounded font-medium border border-zinc-600"
            className:hover={
              status !== "muted" ? "bg-violet-600 text-white" : "bg-zinc-800"
            }
            className:disabled={isDisabled && "opacity-50 cursor-not-allowed"}
            className:sm:hover="underline"
            className:dark="ring-1 ring-zinc-500"
            onClick={() => setIsDisabled((value) => !value)}
          >
            Toggle disabled from button
          </button>
        </Case>
      </div>
    </div>
  );
}

function Case({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        <p className="text-xs text-zinc-500">{detail}</p>
      </div>
      {children}
    </section>
  );
}

export default App;
