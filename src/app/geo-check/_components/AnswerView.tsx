"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

// ChatGPT 답변 원문 뷰. 실제 ChatGPT 화면과 같은 다크 테마로 렌더링한다.
// 앱 나머지는 라이트 테마지만 여기만 어둡게 두는 건 의도적이다 —
// "이건 우리가 만든 화면이 아니라 ChatGPT가 그대로 뱉은 답변"이라는 게 한눈에 구분된다.
//
// 우리 병원이 언급된 부분은 형광펜으로 칠해 바로 눈에 띄게 한다.
// 답변이 길어서 그냥 두면 어디에 나왔는지 찾느라 시간이 걸린다.

/** 인용 칩에 표시할 도메인. (www 제거) */
function domainOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 강조할 표현들로 정규식을 만든다.
 * 정식명·별칭뿐 아니라 브랜드 토큰("리움")까지 넣어서 "리움한의원", "리움 암센터" 같은
 * 관련 언급도 같이 잡히게 한다.
 */
function buildHighlightRe(terms: string[]): RegExp | null {
  const cleaned = [...new Set(terms.map((t) => t.trim()).filter((t) => t.length >= 2))]
    // 긴 것부터 매칭해야 "리움한방병원"이 "리움"보다 먼저 잡힌다
    .sort((a, b) => b.length - a.length)
    .map(escapeRe);
  if (!cleaned.length) return null;
  return new RegExp(`(${cleaned.join("|")})`, "gi");
}

/** 문자열 노드를 훑어 매칭 부분만 <mark> 로 감싼다. */
function highlight(node: React.ReactNode, re: RegExp | null): React.ReactNode {
  if (!re) return node;

  if (typeof node === "string") {
    const parts = node.split(re);
    if (parts.length === 1) return node;
    return parts.map((part, i) =>
      // split 의 캡처 그룹이 홀수 인덱스로 들어온다
      i % 2 === 1 ? (
        <mark
          key={i}
          className="rounded-[3px] bg-[#ffe066] px-1 py-0.5 font-bold text-[#1a1a1a] decoration-clone shadow-[0_0_0_2px_rgba(255,224,102,0.35)]"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }

  if (Array.isArray(node)) return node.map((n, i) => <React.Fragment key={i}>{highlight(n, re)}</React.Fragment>);

  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (el.props?.children === undefined) return node;
    return React.cloneElement(el, { children: highlight(el.props.children, re) });
  }

  return node;
}

function buildComponents(re: RegExp | null): Components {
  const H = ({ children }: { children?: React.ReactNode }) => <>{highlight(children, re)}</>;

  return {
    h1: ({ children }) => (
      <h1 className="mt-6 mb-3 text-[19px] font-bold text-white first:mt-0">
        <H>{children}</H>
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-6 mb-3 text-[17px] font-bold text-white first:mt-0">
        <H>{children}</H>
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-5 mb-2 text-[15px] font-bold text-white first:mt-0">
        <H>{children}</H>
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-4 mb-2 text-[15px] font-bold text-white first:mt-0">
        <H>{children}</H>
      </h4>
    ),
    p: ({ children }) => (
      <p className="my-3 leading-[1.75] first:mt-0">
        <H>{children}</H>
      </p>
    ),
    ol: ({ children }) => (
      <ol className="my-3 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-[#ececec]">
        {children}
      </ol>
    ),
    ul: ({ children }) => (
      <ul className="my-3 list-disc space-y-1.5 pl-6 marker:text-[#8f8f8f]">{children}</ul>
    ),
    li: ({ children }) => (
      <li className="leading-[1.75] pl-1">
        <H>{children}</H>
      </li>
    ),
    // ChatGPT는 병원명 같은 굵은 항목에 옅은 밑줄을 깐다.
    strong: ({ children }) => (
      <strong className="font-bold text-white decoration-[#565656] underline-offset-[5px] [text-decoration-line:underline]">
        <H>{children}</H>
      </strong>
    ),
    em: ({ children }) => <em className="italic text-[#d5d5d5]">{highlight(children, re)}</em>,
    hr: () => <hr className="my-5 border-0 border-t border-[#2f2f2f]" />,
    blockquote: ({ children }) => (
      <blockquote className="my-3 border-l-2 border-[#565656] pl-4 text-[#b4b4b4]">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="rounded bg-[#2f2f2f] px-1.5 py-0.5 text-[13px]">{children}</code>
    ),
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-[#2f2f2f] bg-[#1a1a1a] px-3 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-[#2f2f2f] px-3 py-2">{highlight(children, re)}</td>
    ),
    // web_search 인용 → ChatGPT 스타일 출처 칩. 공식 홈페이지는 노란 테두리로 구분한다.
    a: ({ href, children }) => {
      const domain = href ? domainOf(href) : String(children);
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title={href}
          className="mx-0.5 inline-flex max-w-[220px] items-center gap-1 truncate rounded-full bg-[#2f2f2f] px-2 py-0.5 align-middle text-[11px] text-[#c4c4c4] no-underline transition-colors hover:bg-[#404040] hover:text-white"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8f8f8f]" />
          <span className="truncate">{domain}</span>
        </a>
      );
    },
  };
}

export default function AnswerView({
  markdown,
  /** 강조할 표현들 (정식명·별칭·브랜드 토큰). 비우면 강조하지 않는다. */
  highlightTerms = [],
}: {
  markdown: string;
  highlightTerms?: string[];
}) {
  const re = buildHighlightRe(highlightTerms);
  const components = buildComponents(re);

  return (
    <div className="rounded-xl bg-[#0d0d0d] px-6 py-5 text-[15px] text-[#ececec]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
