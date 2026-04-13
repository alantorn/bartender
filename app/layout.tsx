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
    <html lang="en" className="dark h-full bg-zinc-950 antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
