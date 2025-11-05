import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string | ReactNode;
  features?: string[];
  className?: string;
  href?: string;
}

export function FeatureCard({ icon: Icon, title, description, features, className, href }: FeatureCardProps) {
  const content = (
    <GlassCard className={className} hover={!!href} glow>
      <div className="p-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-3" data-testid={`feature-title-${title.toLowerCase().replace(/\s+/g, "-")}`}>{title}</h3>
        <p className="text-muted-foreground mb-4 leading-relaxed">{description}</p>
        {features && features.length > 0 && (
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-foreground/80">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassCard>
  );

  if (href) {
    return (
      <a href={href} data-testid={`feature-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        {content}
      </a>
    );
  }

  return content;
}
