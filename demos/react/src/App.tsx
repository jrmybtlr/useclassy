import { twMerge } from "tailwind-merge";

function App() {
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <h1
        className="font-bold text-4xl"
        class:md="text-7xl text-blue-200"
        class:hover="text-red-500"
      >
        React Demo
      </h1>

      <div
        className={twMerge("mt-12 text-4xl text-red-500")}
        class:hover="text-blue-500"
      >
        Tailwind Merge
      </div>
    </div>
  );
}

export default App;
