"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { marked } from "marked";
import { analyzeSite } from "@/lib/site-analysis-actions";

// 사이트 분석 — 주소를 입력받아 Claude 기반 SEO/GEO 감사를 실행하고 결과를 보여준다.
export default function SiteAnalysisForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 다운로드 파일에 넣을 메타 (분석 성공 시점의 입력 주소·일시)
  const [analyzedUrl, setAnalyzedUrl] = useState("");
  const [analyzedAt, setAnalyzedAt] = useState("");

  async function run() {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await analyzeSite(url);
      if (res.ok) {
        setReport(res.report);
        setAnalyzedUrl(url.trim());
        setAnalyzedAt(new Date().toLocaleString("ko-KR"));
      } else {
        setError(res.error);
      }
    } catch {
      setError("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function downloadHtml() {
    if (!report) return;
    const html = buildReportHtml(report, analyzedUrl, analyzedAt);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `사이트분석_${hostSlug(analyzedUrl)}_${fileStamp()}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="mt-6">
      <div className="flex max-w-xl gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          disabled={loading}
          placeholder="사이트 주소를 입력하세요 (예: https://example.com)"
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#0e299c] disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={run}
          disabled={loading || !url.trim()}
          className="shrink-0 rounded-lg bg-[#0e299c] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0a1f7a] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {loading ? "분석 중…" : "분석 실행"}
        </button>
      </div>

      {loading && (
        <p className="mt-4 text-sm text-gray-500">
          사이트를 직접 읽고 구글·AI 검색 노출을 분석하고 있어요. 1~3분 정도 걸릴 수 있습니다.
        </p>
      )}

      {error && (
        <div className="mt-4 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {report && (
        <>
          <div className="mt-8 flex items-center gap-2">
            <button
              type="button"
              onClick={downloadHtml}
              className="inline-flex items-center gap-2 rounded-lg border border-[#0e299c] px-4 py-2 text-sm font-semibold text-[#0e299c] transition-colors hover:bg-[#0e299c]/5"
            >
              📄 HTML로 다운로드
            </button>
            <span className="text-xs text-gray-400">분석 일시 {analyzedAt}</span>
          </div>

          <article className="prose prose-sm mt-6 max-w-3xl prose-headings:text-[#0e299c] prose-h1:text-xl prose-h2:mt-8 prose-h2:text-lg prose-a:text-[#0e299c]">
            <ReactMarkdown>{report}</ReactMarkdown>
          </article>
        </>
      )}
    </div>
  );
}

/** 대상 URL 의 호스트만 파일명용으로 뽑는다. (예: https://ssoom.co.kr → ssoom.co.kr) */
function hostSlug(raw: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return "site";
  }
}

/** 파일명용 타임스탬프 (YYYYMMDD-HHmm). */
function fileStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** 마크다운 리포트를 스타일 입힌 단독 HTML 문서로 변환. */
function buildReportHtml(reportMarkdown: string, site: string, when: string): string {
  const body = marked.parse(reportMarkdown, { async: false }) as string;
  const safeSite = escapeHtml(site);
  const safeWhen = escapeHtml(when);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>사이트 분석 리포트 — ${safeSite}</title>
<style>
  :root { --brand: #0e299c; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    color: #1f2937;
    background: #f5f6fa;
    line-height: 1.7;
  }
  .wrap { max-width: 820px; margin: 0 auto; padding: 32px 20px 80px; }
  header.brand {
    background: var(--brand);
    color: #fff;
    border-radius: 14px;
    padding: 22px 26px;
    margin-bottom: 22px;
  }
  header.brand .logo { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; opacity: 0.85; }
  header.brand h1 { margin: 6px 0 12px; font-size: 22px; }
  header.brand .meta { font-size: 13px; opacity: 0.9; }
  header.brand .meta a { color: #fff; text-decoration: underline; word-break: break-all; }
  .report {
    background: #fff;
    border: 1px solid #eceef3;
    border-radius: 14px;
    padding: 28px 30px;
  }
  .report h1 { font-size: 20px; color: var(--brand); margin: 28px 0 12px; }
  .report h2 { font-size: 17px; color: var(--brand); margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #eef0f5; }
  .report h3 { font-size: 15px; margin: 20px 0 8px; }
  .report p { margin: 10px 0; }
  .report ul, .report ol { padding-left: 22px; margin: 10px 0; }
  .report li { margin: 4px 0; }
  .report a { color: var(--brand); word-break: break-all; }
  .report code { background: #f1f2f6; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
  .report table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 14px; }
  .report th, .report td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
  .report th { background: #f5f6fa; }
  .report blockquote { border-left: 3px solid var(--brand); margin: 12px 0; padding: 4px 14px; color: #4b5563; background: #f8f9fc; }
  footer { margin-top: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  @media print { body { background: #fff; } .report, header.brand { border: none; } }
</style>
</head>
<body>
  <div class="wrap">
    <header class="brand">
      <div class="logo">모두보고 · 사이트 분석 리포트</div>
      <h1>SEO / AI 검색 노출 감사</h1>
      <div class="meta">
        대상 사이트: <a href="${safeSite}">${safeSite}</a><br />
        분석 일시: ${safeWhen}
      </div>
    </header>
    <div class="report">${body}</div>
    <footer>본 리포트는 모두보고 사이트 분석 기능으로 생성되었습니다.</footer>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
