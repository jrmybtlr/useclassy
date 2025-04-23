import { useState } from "react";
import "./App.css";

function App() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsActive(!isActive);
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="container">
      <h1>useClassy Demo</h1>
      <div className="demo-section">
        <div
          className={`class-display ${
            isLoading ? "opacity-50" : ""
          } hover:bg-red-500 dark:bg-gray-800 dark:text-white`}
          onClick={handleClick}
        >
          {isLoading ? "Loading..." : "Hover me"}
        </div>
        <div
          className="class-display mt-4"
          class:hover="bg-blue-500"
          class:active="bg-green-500"
          class:dark="bg-gray-700 text-white"
        >
          Hover and click me
        </div>
      </div>
    </div>
  );
}

export default App;
