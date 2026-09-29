import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeOps — Track everything. Miss nothing.",
  description: "AI-powered life admin: one unified, prioritized timeline for bills, renewals, subscriptions and deadlines.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
