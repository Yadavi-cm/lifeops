import { Obligation, HistoryRow, Category } from "./types";

const DAY = 86400000;

export type Channel = "email" | "sms" | "whatsapp" | "pdf";

export function daysLeft(due: string) {
  return Math.round((new Date(due).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
}

// average days early the user historically pays this category
export function avgLag(cat: Category, history: HistoryRow[]) {
  const rows = history.filter((h) => h.category === cat);
  if (!rows.length) return null;
  return rows.reduce((s, h) => s + (new Date(h.dueDate).getTime() - new Date(h.paidDate).getTime()) / DAY, 0) / rows.length;
}

export function habitFactor(cat: Category, history: HistoryRow[]) {
  const lag = avgLag(cat, history);
  if (lag === null) return 0.5;
  return lag <= 1 ? 1 : 0.3; // last-minute payer = higher risk
}

export function score(o: Obligation, all: Obligation[], history: HistoryRow[]) {
  const dl = daysLeft(o.dueDate);
  const urgency = dl <= 0 ? 1 : Math.exp(-dl / 5);
  const penalty = o.amount > 0 ? Math.min(o.lateFee / o.amount, 1) : 0;
  const max = Math.max(...all.map((x) => x.amount), 1);
  const size = Math.min(o.amount / max, 1);
  const habit = habitFactor(o.category, history);
  return Math.round(100 * (0.45 * urgency + 0.25 * penalty + 0.15 * size + 0.15 * habit));
}

export function band(s: number): "critical" | "soon" | "calm" {
  return s >= 60 ? "critical" : s >= 35 ? "soon" : "calm";
}

export function payByDate(o: Obligation, history: HistoryRow[]) {
  const lag = avgLag(o.category, history);
  if (lag !== null && lag <= 1) {
    return new Date(new Date(o.dueDate).getTime() - 2 * DAY).toISOString().slice(0, 10);
  }
  return null;
}

export function payByAdvice(o: Obligation, history: HistoryRow[]) {
  const by = payByDate(o, history);
  return by ? `You usually pay this on the last day, so aim for ${by}.` : "";
}

export interface Conflict { start: string; total: number; count: number; ids: string[] }

export function detectConflicts(list: Obligation[], threshold = 15000): Conflict[] {
  const pend = list.filter((o) => o.status === "pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const out: Conflict[] = [];
  const seen = new Set<string>();
  for (const a of pend) {
    const win = pend.filter((b) => {
      const diff = (new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()) / DAY;
      return diff >= 0 && diff <= 3;
    });
    const total = win.reduce((s, o) => s + o.amount, 0);
    if (total > threshold || win.length >= 3) {
      const key = win.map((o) => o.id).join(",");
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ start: a.dueDate, total, count: win.length, ids: win.map((o) => o.id) });
      }
    }
  }
  return out.sort((a, b) => b.total - a.total);
}

export function commissionFor(amount: number) {
  return Math.min(50, Math.max(2, Math.round(amount * 0.005))); // 0.5%, min Rs2, cap Rs50
}

export interface Insight { headline: string; points: string[] }

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

// Deterministic, explainable insight. The LLM can optionally rephrase it, but never computes it.
export function buildInsight(
  ranked: { o: Obligation; s: number }[],
  history: HistoryRow[],
  conflict?: Conflict
): Insight {
  if (!ranked.length) return { headline: "You're all caught up.", points: ["No pending obligations. Paste a new message to add one."] };
  const top = ranked[0].o;
  const dl = daysLeft(top.dueDate);
  const when = dl < 0 ? `${-dl}d overdue` : dl === 0 ? "due today" : `due in ${dl}d`;
  const points: string[] = [];

  if (top.lateFee > 0) points.push(`Missing it costs ${inr(top.lateFee)} in penalties.`);
  const by = payByAdvice(top, history);
  if (by) points.push(by);
  if (conflict) {
    points.push(`Cash crunch: ${conflict.count} payments totalling ${inr(conflict.total)} land within 3 days of ${conflict.start}. Pay the highest-penalty ones first.`);
  }
  const atRisk = ranked.filter((r) => daysLeft(r.o.dueDate) <= 7).reduce((s, r) => s + r.o.lateFee, 0);
  if (atRisk > 0) points.push(`${inr(atRisk)} in late fees can still be avoided this week.`);

  return { headline: `Pay "${top.title}" first (${when}, ${inr(top.amount)}).`, points };
}
