import type { Metadata, Viewport } from "next";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "모두보고",
  description: "광고 운영 보고서",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-300">
        <QueryProvider>
          <main className="flex-1 w-full min-h-screen">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
