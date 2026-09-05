import { Check, Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ReportActionsProps = {
  title: string;
  content: string;
  filename: string;
};

export function ReportActions({ title, content, filename }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Report copied to clipboard.");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard access is unavailable. Select the report text to copy it.");
    }
  };

  const download = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded.");
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: content });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy();
  };

  return <div className="flex flex-wrap items-center gap-2" aria-label={`${title} actions`}>
    <Button variant="outline" size="sm" onClick={download}><Download className="mr-2 h-3.5 w-3.5" />Download</Button>
    <Button variant="outline" size="sm" onClick={copy}>{copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</Button>
    <Button variant="outline" size="sm" onClick={share}><Share2 className="mr-2 h-3.5 w-3.5" />Share</Button>
  </div>;
}
