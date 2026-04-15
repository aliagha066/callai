import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthUIProvider } from "@/components/AuthUIProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CallAI — AI Companion",
    template: "%s · CallAI",
  },
  description:
    "A premium AI companion experience for natural conversation and future voice/video modes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
        <AuthUIProvider>{children}</AuthUIProvider>
      </body>
    </html>
  );
}
