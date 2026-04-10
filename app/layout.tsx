import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bartender",
  description: "Generate SVG chart cards from ASR evaluation data",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-neutral-900 text-neutral-100 font-sans">{children}</body>
    </html>
  );
}
