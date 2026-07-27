"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Counter
      </h2>
      <p
        className="text-4xl font-mono text-zinc-900 dark:text-zinc-50"
        data-testid="count"
      >
        {count}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
          data-testid="decrement"
        >
          - 1
        </button>
        <button
          onClick={() => setCount(0)}
          className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-600"
          data-testid="reset"
        >
          Reset
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          data-testid="increment"
        >
          + 1
        </button>
      </div>
    </div>
  );
}
