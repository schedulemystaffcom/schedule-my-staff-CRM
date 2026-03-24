import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Nav";
import AuthGate from "@/components/AuthGate";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "ScheduleMyStaff",
  description: "Internal sales CRM for dental and orthodontic practice outreach",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`font-sans ${lora.variable}`}>
        <AuthGate>
          <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto min-w-0">
              {children}
            </main>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
