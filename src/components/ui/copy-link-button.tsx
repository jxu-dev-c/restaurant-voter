"use client";

import { useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/ui/icons";

export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="button button-secondary" type="button" onClick={copy}>
      {copied ? <CheckIcon className="text-success" size={16} /> : <CopyIcon size={16} />}
      {copied ? "Copied" : "Copy referral link"}
    </button>
  );
}
