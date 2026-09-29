# LifeOps — Track Everything. Miss Nothing.

A proactive personal-intelligence app that turns scattered life-admin messages (bills, renewals, subscriptions, documents, appointments) into one prioritized, conflict-aware timeline.

**Live demo:** _add your Vercel link here_

## Problem
Fragmented Life Administration & Obligation Fatigue: overlapping deadlines slip through the cracks, causing penalties and mental exhaustion. Existing tools treat tasks as isolated alerts instead of an interconnected system.

## What it does
1. **Universal Inbox** — paste an email / SMS / WhatsApp / bill text; an LLM extracts structured obligations (type, amount, due date, late fee, source). Live Gmail/WhatsApp sync is roadmap; the prototype takes pasted text.
2. **Unified timeline** — every obligation from every channel in one view, grouped and ranked by priority.
3. **Deterministic priority engine** — explainable scoring, cash-crunch conflict detection and habit-aware pay-by advice.
4. **AI insight** — plain-English plan; the LLM only *explains* what the engine computed.
5. **Reminders** — `.ics` export with alarms 2 days before each due date.
6. **Business layer** — simulated "Pay now" with transaction commission, subscription tiers and a revenue calculator.

## Architecture
```
Browser (Next.js + Tailwind)
  Universal Inbox -> Timeline -> AI Insight -> Pay Now -> Pricing
        |                ^  Priority Engine (deterministic TypeScript)
        v                |  localStorage (obligations, transactions)
  POST /api/extract -> LLM (Claude) -> validated structured JSON
  POST /api/insight -> LLM explains the computed plan (optional)
  POST /api/pay     -> commission calculation (mock payment)
```

## Algorithm
```
urgency = exp(-daysLeft/5)            (overdue = 1)
penalty = min(lateFee/amount, 1)
size    = min(amount/maxAmount, 1)
habit   = 1 if user historically pays last-minute else 0.3
score   = 100 * (0.45*urgency + 0.25*penalty + 0.15*size + 0.15*habit)
```
- **Conflict detection:** sliding 3-day window; flags if total > ₹15,000 or 3+ payments cluster.
- **Habit learning:** categories paid on the due date get a "pay 2 days early" nudge.
- **Reminders:** `.ics` alarm 2 days before each due date.

## Business model
- **Subscriptions:** Free (₹0), Pro (₹199/mo), Family/Business (₹499/mo)
- **Transaction commission:** 0.5% per payment executed via the app (min ₹2, cap ₹50)
- **Partner referral fees** from insurers and utilities

## Prototype scope (honest limits)
Payments are simulated, data lives in the browser (localStorage), and channels are pasted rather than OAuth-connected. Payment history used for habit learning is seeded demo data.

## Tech
Next.js (App Router), TypeScript, Tailwind, lucide-react, Vercel serverless routes, Anthropic API.

## Run locally
```
npm install
echo "ANTHROPIC_API_KEY=your_key" > .env.local
npm run dev
```
Optional: set `ANTHROPIC_MODEL` to override the default model.

## Future scope
Gmail/WhatsApp OAuth ingestion, UPI autopay, push/SMS reminders, per-user database and auth, on-device ML for habit prediction, family shared workspaces.
