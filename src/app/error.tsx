"use client";

import ErrorState from "@/components/ErrorState";

export default function GlobalSegmentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} />;
}
