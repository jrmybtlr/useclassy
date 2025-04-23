function App() {
  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <h1 className="text-4xl font-bold">React Demo</h1>
      <div
        className="bg-zinc-500 rounded-full px-4 cursor-cell py-2 mt-4"
        class:hover="bg-blue-500"
        class:active="bg-green-500"
        class:dark="bg-gray-700 text-white"
      >
        Hover me
      </div>
    </div>
  );
}

export default App;
