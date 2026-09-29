"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, CalendarClock, CalendarPlus, Car, FileText, Inbox, Lightbulb, Loader2,
  Mail, MessageCircle, Repeat, ShieldCheck, Smartphone, Sparkles, Trash2, TrendingDown, Wallet, Zap, X, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Obligation, Transaction, Category } from "@/lib/types";
import { seedObligations, seedHistory } from "@/lib/seed";
import { samples } from "@/lib/samples";
import { score, band, daysLeft, detectConflicts, payByAdvice, commissionFor, buildInsight, type Channel } from "@/lib/engine";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

const CATEGORY: Record<Category, { label: string; icon: LucideIcon; tint: string }> = {
  utility: { label: "Utility", icon: Zap, tint: "bg-amber-100 text-amber-700" },
  insurance: { label: "Insurance", icon: ShieldCheck, tint: "bg-sky-100 text-sky-700" },
  vehicle: { label: "Vehicle", icon: Car, tint: "bg-violet-100 text-violet-700" },
  subscription: { label: "Subscription", icon: Repeat, tint: "bg-pink-100 text-pink-700" },
  document: { label: "Document", icon: FileText, tint: "bg-emerald-100 text-emerald-700" },
  appointment: { label: "Appointment", icon: CalendarClock, tint: "bg-orange-100 text-orange-700" },
};

const CHANNELS: { id: Channel; label: string; icon: LucideIcon }[] = [
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: Smartphone },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "pdf", label: "PDF / Bill", icon: FileText },
];

const BAND = {
  critical: { label: "Critical", dot: "bg-red-500", pill: "bg-red-100 text-red-700", bar: "bg-red-500" },
  soon: { label: "Soon", dot: "bg-amber-500", pill: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
  calm: { label: "Comfortable", dot: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
};

function downloadIcs(list: Obligation[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LifeOps//EN"];
  list.forEach((o) => {
    lines.push("BEGIN:VEVENT", `UID:${o.id}@lifeops`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${o.dueDate.replace(/-/g, "")}`, `SUMMARY:${o.title} - ${inr(o.amount)}`,
      "BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", "DESCRIPTION:Due soon", "END:VALARM", "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  a.download = "lifeops.ics";
  a.click();
}

function dueLabel(dl: number) {
  if (dl < 0) return `${-dl}d overdue`;
  if (dl === 0) return "Due today";
  if (dl === 1) return "Due tomorrow";
  return `Due in ${dl} days`;
}

export default function Home() {
  const [obs, setObs] = useState<Obligation[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [paying, setPaying] = useState<Obligation | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const o = localStorage.getItem("lo_obs");
      const t = localStorage.getItem("lo_txns");
      setObs(o ? JSON.parse(o) : seedObligations);
      setTxns(t ? JSON.parse(t) : []);
    } catch { setObs(seedObligations); }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("lo_obs", JSON.stringify(obs));
      localStorage.setItem("lo_txns", JSON.stringify(txns));
    } catch { /* storage unavailable */ }
  }, [obs, txns, ready]);

  async function analyze() {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, channel }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Extraction failed");
      if (!j.obligations.length) throw new Error("No obligations found in that message.");
      setObs((p) => [...p, ...j.obligations]);
      setText(""); setAiText("");
    } catch (e) { setErr((e instanceof Error ? e.message : "Failed") + " You can still use the sample data below."); }
    setLoading(false);
  }

  async function confirmPay(o: Obligation) {
    try {
      const r = await fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ obligationId: o.id, amount: o.amount }) });
      const j = await r.json();
      setTxns((p) => [...p, { obligationId: o.id, amount: o.amount, commission: j.commission, timestamp: j.timestamp }]);
    } catch {
      setTxns((p) => [...p, { obligationId: o.id, amount: o.amount, commission: commissionFor(o.amount), timestamp: new Date().toISOString() }]);
    }
    setObs((p) => p.map((x) => (x.id === o.id ? { ...x, status: "paid" } : x)));
    setPaying(null); setAiText("");
  }

  const pending = useMemo(() => obs.filter((o) => o.status === "pending"), [obs]);
  const ranked = useMemo(
    () => pending.map((o) => ({ o, s: score(o, pending, seedHistory) })).sort((a, b) => b.s - a.s),
    [pending]
  );
  const conflict = useMemo(() => detectConflicts(obs)[0], [obs]);
  const insight = useMemo(() => buildInsight(ranked, seedHistory, conflict), [ranked, conflict]);

  const week = ranked.filter((r) => daysLeft(r.o.dueDate) <= 7);
  const weekAmount = week.reduce((s, r) => s + r.o.amount, 0);
  const atRisk = week.reduce((s, r) => s + r.o.lateFee, 0);
  const feesAvoided = obs.filter((o) => o.status === "paid").reduce((s, o) => s + o.lateFee, 0);
  const commission = txns.reduce((s, t) => s + t.commission, 0);

  const groups = [
    { title: "Overdue & today", items: ranked.filter((r) => daysLeft(r.o.dueDate) <= 0) },
    { title: "This week", items: ranked.filter((r) => { const d = daysLeft(r.o.dueDate); return d > 0 && d <= 7; }) },
    { title: "Later", items: ranked.filter((r) => daysLeft(r.o.dueDate) > 7) },
  ].filter((g) => g.items.length);

  async function explainWithAi() {
    setAiLoading(true); setAiErr("");
    try {
      const payload = {
        topPriorities: ranked.slice(0, 4).map(({ o, s }) => ({ title: o.title, amount: o.amount, dueInDays: daysLeft(o.dueDate), lateFee: o.lateFee, priorityScore: s })),
        cashCrunch: conflict ? { payments: conflict.count, total: conflict.total, from: conflict.start } : null,
        engineInsight: insight,
      };
      const r = await fetch("/api/insight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setAiText(j.text);
    } catch { setAiErr("AI explanation unavailable right now. The plan above is computed locally."); }
    setAiLoading(false);
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white"><Sparkles size={18} /></div>
            <div>
              <div className="text-lg font-bold leading-tight tracking-tight">LifeOps</div>
              <div className="text-xs text-slate-500">Track everything. Miss nothing.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 sm:inline">Prototype</span>
            <Link href="/pricing" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">Pricing</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={CalendarClock} tone="text-indigo-600 bg-indigo-50" label="Due in 7 days" value={String(week.length)} hint={`${pending.length} pending in total`} />
          <Stat icon={Wallet} tone="text-sky-600 bg-sky-50" label="Cash needed this week" value={inr(weekAmount)} hint="across all channels" />
          <Stat icon={AlertTriangle} tone="text-red-600 bg-red-50" label="Penalties at risk" value={inr(atRisk)} hint="avoidable if paid on time" />
          <Stat icon={TrendingDown} tone="text-emerald-600 bg-emerald-50" label="Fees avoided" value={inr(feesAvoided)} hint="from payments made here" />
        </section>

        {conflict && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />
            <div className="text-sm">
              <b>Cash-crunch warning:</b> {conflict.count} payments totalling <b>{inr(conflict.total)}</b> fall within 3 days starting {conflict.start}. Pay the highest-penalty ones first.
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: inbox + AI insight */}
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Inbox size={18} className="text-indigo-600" />
                <h2 className="font-semibold">Universal Inbox</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">Paste anything that arrived on any channel. Live Gmail / WhatsApp sync is on the roadmap; this prototype takes pasted text.</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {CHANNELS.map((c) => (
                  <button key={c.id} onClick={() => setChannel(c.id)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${channel === c.id ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                    <c.icon size={13} /> {c.label}
                  </button>
                ))}
              </div>

              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
                className="mt-3 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="e.g. Your HDFC ERGO car insurance expires on 5 Oct. Renew for ₹11,800 to avoid lapse..." />

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">Try a sample:</span>
                {samples.map((s) => (
                  <button key={s.label} onClick={() => { setText(s.text()); setChannel(s.channel); }}
                    className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-200">{s.label}</button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={analyze} disabled={loading || !text.trim()}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {loading ? "Analyzing..." : "Extract obligations"}
                </button>
                <button onClick={() => { setObs(seedObligations); setTxns([]); setAiText(""); setErr(""); }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Load demo data</button>
              </div>
              {err && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{err}</p>}
            </section>

            <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-md">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} />
                <h2 className="font-semibold">AI insight</h2>
              </div>
              <p className="mt-3 text-base font-semibold leading-snug">{insight.headline}</p>
              <ul className="mt-3 space-y-2 text-sm text-indigo-50">
                {insight.points.map((p) => (
                  <li key={p} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" /> <span>{p}</span></li>
                ))}
              </ul>
              {aiText && <p className="mt-4 rounded-xl bg-white/15 p-3 text-sm leading-relaxed">{aiText}</p>}
              {aiErr && <p className="mt-3 text-xs text-indigo-100">{aiErr}</p>}
              <button onClick={explainWithAi} disabled={aiLoading || !ranked.length}
                className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {aiLoading ? "Thinking..." : "Explain this plan with AI"}
              </button>
              <p className="mt-3 text-[11px] text-indigo-200">Priorities are computed by a deterministic scoring engine (urgency, penalty, amount, your payment habits). AI only extracts and explains.</p>
            </section>
          </div>

          {/* Right: timeline */}
          <div className="space-y-4 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Unified timeline</h2>
              <button onClick={() => downloadIcs(pending)} disabled={!pending.length}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
                <CalendarPlus size={15} /> Add to calendar
              </button>
            </div>

            {ready && !groups.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                <Check className="mx-auto mb-2 text-emerald-500" />
                Nothing pending. Paste a message or load demo data.
              </div>
            )}

            {groups.map((g) => (
              <div key={g.title} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.title}</div>
                {g.items.map(({ o, s }) => {
                  const b = BAND[band(s)];
                  const cat = CATEGORY[o.category] ?? CATEGORY.utility;
                  const Icon = cat.icon;
                  const dl = daysLeft(o.dueDate);
                  const advice = payByAdvice(o, seedHistory);
                  return (
                    <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cat.tint}`}><Icon size={18} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold">{o.title}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.pill}`}>{b.label}</span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
                            <span className={dl <= 1 ? "font-semibold text-red-600" : ""}>{dueLabel(dl)} · {o.dueDate}</span>
                            <span>{cat.label}</span>
                            <span>via {o.source}</span>
                            {o.recurring && <span>recurring</span>}
                          </div>
                          {(o.lateFee > 0 || advice) && (
                            <div className="mt-1.5 text-xs text-slate-600">
                              {o.lateFee > 0 && <span className="mr-2 rounded bg-red-50 px-1.5 py-0.5 text-red-700">Late fee {inr(o.lateFee)}</span>}
                              {advice}
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${b.bar}`} style={{ width: `${Math.min(s, 100)}%` }} /></div>
                            <span className="text-[11px] font-medium text-slate-500">Priority {s}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="font-bold">{inr(o.amount)}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setObs((p) => p.filter((x) => x.id !== o.id))} aria-label="Remove" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"><Trash2 size={15} /></button>
                            {o.amount > 0 && (
                              <button onClick={() => setPaying(o)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">Pay now</button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            <section className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <div><span className="font-semibold">Revenue panel</span> <span className="text-slate-500">(prototype)</span></div>
              <div className="text-slate-700">{txns.length} transactions · commission earned <b>{inr(commission)}</b> · 0.5% per payment (min ₹2, cap ₹50)</div>
            </section>
          </div>
        </div>

        <footer className="pb-6 text-center text-xs text-slate-400">LifeOps · hackathon prototype · payments are simulated · data stays in your browser</footer>
      </main>

      {/* Payment modal */}
      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPaying(null)}>
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 text-slate-900 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">{paying.title}</h3>
              <button onClick={() => setPaying(null)} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-600">Bill amount</dt><dd>{inr(paying.amount)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-600">LifeOps fee (0.5%)</dt><dd>{inr(commissionFor(paying.amount))}</dd></div>
              <div className="flex justify-between border-t pt-2 text-base font-bold"><dt>Total</dt><dd>{inr(paying.amount + commissionFor(paying.amount))}</dd></div>
            </dl>
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Prototype: no real money moves. This simulates the automated transaction-commission revenue stream.</p>
            <div className="flex gap-2">
              <button onClick={() => confirmPay(paying)} className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Confirm (mock)</button>
              <button onClick={() => setPaying(null)} className="flex-1 rounded-xl border border-slate-300 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, tone, label, value, hint }: { icon: LucideIcon; tone: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon size={16} /></div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-xl font-bold tracking-tight sm:text-2xl">{value}</div>
      <div className="text-[11px] text-slate-400">{hint}</div>
    </div>
  );
}
