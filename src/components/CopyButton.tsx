"use client";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }

  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={handleCopy}
      title="Copy post text"
    >
      {copied ? "✓ Copied" : "📋 Copy"}
    </button>
  );
}
