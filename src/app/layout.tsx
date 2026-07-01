import type { Metadata } from "next";
import { QueryProvider } from "@/providers/QueryProvider";
import ChannelTalk from "@/components/ChannelTalk";

import "@seed-design/css/all.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "모두보고",
  description: "광고 운영 보고서",
  icons: { icon: "/images/modubogo_favicon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <main className="flex-1 w-full min-h-screen">{children}</main>
        </QueryProvider>
        <ChannelTalk />
      </body>
    </html>
  );
}
