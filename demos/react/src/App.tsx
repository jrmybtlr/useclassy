import { useState } from "react";
import { twMerge } from "tailwind-merge";

function App() {
  const [isActive, setIsActive] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);

  return (
    <div className="flex flex-col h-screen items-center justify-center gap-10">
      <h1
        className="font-bold text-4xl"
        className:md="text-7xl text-blue-200"
        className:hover="text-red-500"
      >
        React Demo
      </h1>

      <div
        className={twMerge("text-4xl text-red-500")}
        className:hover="text-blue-500"
      >
        Tailwind Merge
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-zinc-400">Conditional variants</p>

        <button
          type="button"
          disabled={isDisabled}
          className="px-6 py-3 rounded-lg font-semibold transition"
          className:hover={isActive ? "bg-blue-500 text-white scale-105" : "bg-zinc-700 text-zinc-200"}
          className:disabled={isDisabled && "opacity-40 cursor-not-allowed"}
          className:focus="ring-2 ring-blue-300 outline-none"
          onClick={() => setIsActive((value) => !value)}
        >
          {isActive ? "Active hover styles" : "Muted hover styles"}
        </button>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={(event) => setIsDisabled(event.target.checked)}
          />
          Disabled
        </label>
      </div>
    </div>
  );
}

export default App;
