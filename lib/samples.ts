import type { Channel } from "./engine";

const fmt = (n: number) =>
  new Date(Date.now() + n * 86400000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export interface Sample { label: string; channel: Channel; text: () => string }

export const samples: Sample[] = [
  {
    label: "Electricity SMS",
    channel: "sms",
    text: () => `TANGEDCO: Your electricity bill of Rs 2,180 is due on ${fmt(2)}. Pay before due date to avoid Rs 75 late fee.`,
  },
  {
    label: "Insurance email",
    channel: "email",
    text: () =>
      `Subject: Policy renewal reminder\nDear customer, your HDFC ERGO car insurance policy expires on ${fmt(4)}. Renew now for Rs 11,800 to avoid a lapse in cover. A reinstatement penalty of Rs 1,000 applies after expiry.`,
  },
  {
    label: "WhatsApp mix",
    channel: "whatsapp",
    text: () =>
      `Hi! Reminder from Speedy Bikes: your bike service (Rs 1,800) is due on ${fmt(8)}. Also, your Jio postpaid bill of Rs 749 is due on ${fmt(3)}, late fee Rs 100.`,
  },
  {
    label: "Subscriptions",
    channel: "email",
    text: () =>
      `Your Netflix plan renews on ${fmt(3)} for Rs 649. Your Spotify Premium renews on ${fmt(5)} for Rs 119. Your driving licence expires on ${fmt(25)}; renewal fee Rs 1,000, late fee Rs 500.`,
  },
];
