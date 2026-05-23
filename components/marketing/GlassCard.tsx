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
        "glass-card",
        hover && "glass-hover",
        glow && "card-glow",
        className
      )}
      data-testid="glass-card"
    >
      {children}
    </div>
  );
}
