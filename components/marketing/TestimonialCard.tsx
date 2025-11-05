import { GlassCard } from "./GlassCard";
import { Quote } from "lucide-react";

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  company: string;
}

export function TestimonialCard({ quote, author, role, company }: TestimonialCardProps) {
  return (
    <GlassCard className="p-8 h-full" glow>
      <div className="flex flex-col h-full">
        <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
        <p className="text-foreground/90 mb-6 leading-relaxed flex-grow italic" data-testid={`testimonial-quote-${author.toLowerCase().replace(/\s+/g, "-")}`}>
          "{quote}"
        </p>
        <div className="border-t border-white/10 pt-4">
          <div className="font-semibold" data-testid={`testimonial-author-${author.toLowerCase().replace(/\s+/g, "-")}`}>{author}</div>
          <div className="text-sm text-muted-foreground">{role}</div>
          <div className="text-sm text-primary font-medium mt-1">{company}</div>
        </div>
      </div>
    </GlassCard>
  );
}
