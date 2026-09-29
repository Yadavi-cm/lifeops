import { Obligation, HistoryRow, Category } from "./types";

const d = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const ob = (id: string, title: string, category: Category, amount: number, days: number, lateFee: number, source: string, recurring = true): Obligation =>
  ({ id, title, category, amount, currency: "INR", dueDate: d(days), lateFee, source, status: "pending", recurring });

export const seedObligations: Obligation[] = [
  ob("s1", "Electricity bill (TNEB)", "utility", 2400, 2, 150, "sms"),
  ob("s2", "Car insurance renewal", "insurance", 12500, 3, 1000, "email"),
  ob("s3", "Netflix subscription", "subscription", 649, 3, 0, "email"),
  ob("s4", "Broadband bill", "utility", 999, 6, 100, "whatsapp"),
  ob("s5", "Bike service", "vehicle", 3500, 9, 0, "sms", false),
  ob("s6", "Driving licence renewal", "document", 1000, 21, 500, "email", false),
];

const past = (category: Category, dueAgo: number, lag: number): HistoryRow =>
  ({ category, dueDate: d(-dueAgo), paidDate: d(-dueAgo - lag) });

// Simulated payment history so the habit-learning model has something to learn from.
export const seedHistory: HistoryRow[] = [
  past("utility", 30, 0), past("utility", 60, 0), past("utility", 90, 1),
  past("insurance", 365, 10),
  past("subscription", 30, 0), past("subscription", 60, 0),
  past("vehicle", 120, 5),
];
