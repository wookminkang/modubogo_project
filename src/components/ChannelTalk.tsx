"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type ChannelIO = ((...args: unknown[]) => void) & {
  c?: (args: unknown) => void;
  q?: unknown[];
};

declare global {
  interface Window {
    ChannelIO?: ChannelIO;
    ChannelIOInitialized?: boolean;
  }
}

const PLUGIN_KEY = process.env.NEXT_PUBLIC_CHANNELTALK_PLUGIN_KEY;

// 채널톡 SDK 로더 (공식 부트 스크립트 이식)
function loadChannelIO() {
  const w = window;
  if (w.ChannelIO) return;
  const ch: ChannelIO = function (...args: unknown[]) {
    ch.c?.(args);
  } as ChannelIO;
  ch.q = [];
  ch.c = (args) => {
    ch.q?.push(args);
  };
  w.ChannelIO = ch;
  if (w.ChannelIOInitialized) return;
  w.ChannelIOInitialized = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://cdn.channel.io/plugin/ch-plugin-web.js";
  document.head.appendChild(s);
}

// 채널톡을 숨길 경로 (디자이너 공개 뷰 등 외부 노출 화면)
const HIDDEN_PREFIXES = ["/design"];

/**
 * 채널톡 상담 위젯. 루트 레이아웃에 마운트되어 전역에 표시된다.
 * 플러그인 키는 NEXT_PUBLIC_CHANNELTALK_PLUGIN_KEY 환경변수에서 읽는다.
 * 단, HIDDEN_PREFIXES 경로(디자이너 뷰 등)에서는 부팅하지 않고 숨긴다.
 */
export default function ChannelTalk() {
  const pathname = usePathname();

  useEffect(() => {
    if (!PLUGIN_KEY) return;
    const hidden = HIDDEN_PREFIXES.some(
      (p) => pathname === p || pathname?.startsWith(`${p}/`),
    );
    if (hidden) {
      // 다른 페이지에서 넘어와 이미 떠 있는 경우 내려준다.
      window.ChannelIO?.("shutdown");
      return;
    }
    loadChannelIO();
    window.ChannelIO?.("boot", { pluginKey: PLUGIN_KEY });
    return () => window.ChannelIO?.("shutdown");
  }, [pathname]);

  return null;
}
