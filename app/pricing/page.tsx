"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Zap } from "lucide-react";

const tiers = [
  { name: "Free", price: "₹0", sub: "forever", features: ["Up to 10 obligations", "Universal Inbox (manual paste)", "Priority timeline"], highlight: false },
  { name: "Pro", price: "₹199", sub: "per month", features: ["Unlimited obligations", "Gmail + SMS sync", "AI plan + cash-crunch alerts", "Autopay + smart reminders"], highlight: true },
  { name: "Family / Business", price: "₹499", sub: "per month", features: ["Everything in Pro", "Shared workspace", "WhatsApp + team channels", "Priority support"], highlight: false },
];

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function Pricing() {
  const [users, setUsers] = useState(2000);
  const [volume, setVolume] = useState(8000);
  const [bill, setBill] = useState(4200);

  const commissionPerBill = Math.min(50, Math.max(2, Math.round(bill * 0.005)));
  const proUsers = users * 0.2; // assume 20% convert to Pro
  const subRevenue = proUsers * 199 * 12;
  const commRevenue = users * volume * 0.005 * 12;

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 sm:p-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Back to dashboard</Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Simple pricing. Two revenue streams.</h1>
        <p className="mt-1 text-slate-600">Subscription tiers for users, plus a small commission on every payment executed through LifeOps.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={`relative rounded-2xl border bg-white p-6 shadow-sm ${t.highlight ? "border-2 border-indigo-600 shadow-indigo-100" : "border-slate-200"}`}>
            {t.highlight && <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>}
            <h2 className="text-lg font-semibold">{t.name}</h2>
            <p className="mt-2"><span className="text-3xl font-bold">{t.price}</span> <span className="text-sm text-slate-500">{t.sub}</span></p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold"><Zap size={18} className="text-amber-500" /> Commission calculator</h2>
          <p className="mt-1 text-sm text-slate-600">0.5% per payment executed through LifeOps (min ₹2, cap ₹50).</p>
          <label className="mt-4 block text-sm font-medium">Bill amount: {inr(bill)}</label>
          <input type="range" min={100} max={20000} step={100} value={bill} onChange={(e) => setBill(+e.target.value)} className="w-full accent-indigo-600" />
          <p className="mt-3 text-2xl font-bold text-indigo-700">{inr(commissionPerBill)} <span className="text-sm font-normal text-slate-500">commission on this bill</span></p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Illustrative revenue model</h2>
          <label className="mt-3 block text-sm font-medium">Users: {users.toLocaleString("en-IN")}</label>
          <input type="range" min={100} max={20000} step={100} value={users} onChange={(e) => setUsers(+e.target.value)} className="w-full accent-indigo-600" />
          <label className="mt-2 block text-sm font-medium">Avg monthly bills routed per user: {inr(volume)}</label>
          <input type="range" min={1000} max={30000} step={500} value={volume} onChange={(e) => setVolume(+e.target.value)} className="w-full accent-indigo-600" />
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">Subscriptions (20% on Pro)</dt><dd className="font-semibold">{inr(subRevenue)}/yr</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">Transaction commission</dt><dd className="font-semibold">{inr(commRevenue)}/yr</dd></div>
            <div className="flex justify-between border-t pt-1"><dt className="font-medium">Total</dt><dd className="font-bold text-indigo-700">{inr(subRevenue + commRevenue)}/yr</dd></div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">Assumptions are illustrative. Partner referral fees from insurers and utilities are additional upside.</p>
        </div>
      </section>
    </main>
  );
}
