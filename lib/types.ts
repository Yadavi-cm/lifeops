export type Category = "utility" | "insurance" | "vehicle" | "subscription" | "document" | "appointment";

export interface Obligation {
  id: string;
  title: string;
  category: Category;
  amount: number;
  currency: string;
  dueDate: string; // YYYY-MM-DD
  lateFee: number;
  source: string;
  status: "pending" | "paid";
  recurring: boolean;
}
export interface HistoryRow { category: Category; dueDate: string; paidDate: string }
export interface Transaction { obligationId: string; amount: number; commission: number; timestamp: string }
