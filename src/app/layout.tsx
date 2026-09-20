import type { Metadata, Viewport } from "next";

import { AppNav } from "@/components/app-nav";
import { getViewer } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lineups", template: "%s | Lineups" },
  description: "Rowing lineup builder",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8c1515",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AppNav viewer={viewer} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-4 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
