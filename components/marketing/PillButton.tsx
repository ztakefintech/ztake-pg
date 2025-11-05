import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import Link from "next/link";

interface PillButtonProps {
  children: ReactNode;
  variant?: "default" | "outline" | "ghost" | "primary";
  size?: "default" | "sm" | "lg";
  className?: string;
  onClick?: () => void;
  href?: string;
  testId?: string;
  type?: "button" | "submit";
}

export function PillButton({ 
  children, 
  variant = "default", 
  size = "default", 
  className,
  onClick,
  href,
  testId,
  type = "button"
}: PillButtonProps) {
  const buttonVariant = variant === "primary" ? "default" : variant;

  if (href) {
    return (
      <Button 
        variant={buttonVariant}
        size={size}
        className={cn("rounded-full", className)}
        data-testid={testId}
        asChild
      >
        <Link href={href}>{children}</Link>
      </Button>
    );
  }

  return (
    <Button 
      variant={buttonVariant}
      size={size}
      className={cn("rounded-full", className)}
      onClick={onClick}
      data-testid={testId}
      type={type}
    >
      {children}
    </Button>
  );
}
