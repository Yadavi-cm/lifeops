"use client";

import { useState } from "react";

type Obligation = {
  type: string;
  title: string;
  provider: string | null;
  amount: number | null;
  dueDate: string | null;
  action: string;
  priority: "low" | "medium" | "high";
  summary: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Obligation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyzeMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze the message"
      );
    } finally {
      setLoading(false);
    }
  };

  const priorityStyles = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Life<span className="text-cyan-400">Ops</span>
            </h1>
            <p className="text-sm text-slate-400">
              Your personal operations assistant
            </p>
          </div>

          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            AI Powered
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-cyan-400">
            Intelligent obligation management
          </p>

          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Turn messy messages into
            <span className="block text-cyan-400">
              actionable tasks.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-slate-400">
            Paste an electricity bill, insurance email, subscription
            notification, or any everyday message. LifeOps extracts what
            matters and tells you what to do next.
          </p>
        </div>

        {/* Input Card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <label className="mb-3 block text-sm font-medium text-slate-300">
            Paste your message
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Example: Your electricity bill of ₹1,847 is due on October 5, 2026..."
            className="min-h-40 w-full resize-none rounded-2xl border border-white/10 bg-slate-900 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              AI extracts dates, amounts, actions and priority.
            </p>

            <button
              onClick={analyzeMessage}
              disabled={loading || !message.trim()}
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Analyzing..." : "✨ Analyze"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-cyan-400">
                    Extracted obligation
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    {result.title}
                  </h3>

                  {result.provider && (
                    <p className="mt-1 text-sm text-slate-400">
                      {result.provider}
                    </p>
                  )}
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                    priorityStyles[result.priority]
                  }`}
                >
                  {result.priority} priority
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Amount</p>
                <p className="mt-1 text-xl font-semibold">
                  {result.amount !== null
                    ? `₹${result.amount.toLocaleString("en-IN")}`
                    : "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Due date</p>
                <p className="mt-1 text-xl font-semibold">
                  {result.dueDate || "—"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Type</p>
                <p className="mt-1 text-xl font-semibold capitalize">
                  {result.type || "—"}
                </p>
              </div>
            </div>

            <div className="mx-6 mb-6 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-5">
              <p className="text-xs uppercase tracking-wider text-cyan-400">
                Recommended action
              </p>

              <p className="mt-2 font-medium text-white">
                {result.action}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {result.summary}
              </p>
            </div>
          </div>
        )}

        {/* Example messages */}
        <div className="mt-10">
          <p className="mb-3 text-sm font-medium text-slate-400">
            Try an example
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              "Electricity bill ₹1847. Due October 5, 2026.",
              "Insurance renewal ₹12,450 due October 18, 2026.",
              "Netflix ₹649 subscription renews October 12, 2026.",
            ].map((example) => (
              <button
                key={example}
                onClick={() => setMessage(example)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm text-slate-400 transition hover:border-cyan-400/30 hover:bg-white/[0.06] hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}