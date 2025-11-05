import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = "javascript", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative rounded-2xl overflow-hidden backdrop-blur-xl bg-gray-900/90 dark:bg-black/90 border border-white/10", className)}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-gray-800/50">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover-elevate transition-all duration-200 text-gray-400 hover:text-white"
          data-testid="button-copy-code"
          aria-label="Copy code"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-gray-300 font-mono leading-relaxed" data-testid="code-content">
          {code}
        </code>
      </pre>
    </div>
  );
}
