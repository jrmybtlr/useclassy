import { twMerge } from "tailwind-merge";

function App() {
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <h1 className="font-bold text-4xl" class:md="text-7xl text-blue-200">
        React Demo
      </h1>
      <div className="text-red-500" class:hover="text-blue-500">
        Hello
      </div>
      <div
        className="bg-zinc-500 rounded-full px-4 cursor-cell py-2 mt-4"
        class:hover="bg-blue-500"
      >
        Hover me
      </div>

      <div className={twMerge("text-red-500")} class:hover="text-blue-500">
        Tailwind Merge
      </div>
    </div>
  );
}

export default App;
