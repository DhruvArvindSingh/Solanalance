import { Crown, Award, Medal, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type RatingTier = "gold" | "silver" | "bronze" | "iron";

interface RatingBadgeProps {
  tier: RatingTier;
  points?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierConfig = {
  gold: {
    icon: Crown,
    label: "Gold",
    color: "text-tier-gold",
    bg: "bg-tier-gold/10",
    border: "border-tier-gold/30",
    glow: "shadow-[0_0_20px_rgba(255,215,0,0.3)]",
  },
  silver: {
    icon: Award,
    label: "Silver",
    color: "text-tier-silver",
    bg: "bg-tier-silver/10",
    border: "border-tier-silver/30",
    glow: "shadow-[0_0_20px_rgba(192,192,192,0.3)]",
  },
  bronze: {
    icon: Medal,
    label: "Bronze",
    color: "text-tier-bronze",
    bg: "bg-tier-bronze/10",
    border: "border-tier-bronze/30",
    glow: "shadow-[0_0_20px_rgba(205,127,50,0.3)]",
  },
  iron: {
    icon: Shield,
    label: "Iron",
    color: "text-tier-iron",
    bg: "bg-tier-iron/10",
    border: "border-tier-iron/30",
    glow: "shadow-[0_0_20px_rgba(74,74,74,0.3)]",
  },
};

const sizeConfig = {
  sm: {
    container: "h-6 px-2 text-xs",
    icon: "w-3 h-3",
  },
  md: {
    container: "h-8 px-3 text-sm",
    icon: "w-4 h-4",
  },
  lg: {
    container: "h-10 px-4 text-base",
    icon: "w-5 h-5",
  },
};

export const RatingBadge = ({ tier, points, size = "md", className }: RatingBadgeProps) => {
  const config = tierConfig[tier];
  const sizeClasses = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center space-x-1.5 rounded-full font-medium border",
        config.bg,
        config.border,
        config.glow,
        sizeClasses.container,
        "shine",
        className
      )}
    >
      <Icon className={cn(sizeClasses.icon, config.color)} />
      <span className={config.color}>{config.label}</span>
      {points !== undefined && (
        <>
          <span className="text-muted-foreground">•</span>
          <span className={config.color}>{points}</span>
        </>
      )}
    </div>
  );
};
