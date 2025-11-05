import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({ children, className, hover = false, glow = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl backdrop-blur-xl border overflow-visible",
        // Softer translucency and lighter borders for better contrast in dark mode
        "bg-white/60 dark:bg-white/5",
        "border-black/5 dark:border-white/5",
        "shadow-xl shadow-black/5 dark:shadow-black/10",
        hover && "hover-elevate transition-all duration-300 cursor-pointer",
        glow && "ring-1 ring-black/5 dark:ring-white/5",
        className
      )}
      data-testid="glass-card"
    >
      {glow && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent dark:from-white/10 pointer-events-none" />
      )}
      {children}
    </div>
  );
}
