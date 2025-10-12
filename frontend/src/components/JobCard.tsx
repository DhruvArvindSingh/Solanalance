import { Button } from "@/components/ui/button";
import { RatingBadge } from "@/components/RatingBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Users, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface JobCardProps {
  id?: string;
  title: string;
  company: string;
  recruiterName: string;
  recruiterAvatar?: string;
  recruiterTier: "gold" | "silver" | "bronze" | "iron";
  description: string;
  skills: string[];
  totalPayment: number;
  stages: { name: string; payment: number }[];
  postedDate: string;
  applicants: number;
  className?: string;
}

export const JobCard = ({
  id,
  title,
  company,
  recruiterName,
  recruiterAvatar,
  recruiterTier,
  description,
  skills,
  totalPayment,
  stages,
  postedDate,
  applicants,
  className,
}: JobCardProps) => {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        "group relative p-6 rounded-2xl glass border border-white/10",
        "hover-lift cursor-pointer transition-all duration-300",
        "bg-gradient-card hover:border-white/20",
        className
      )}
      onClick={() => id && navigate(`/jobs/${id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12 border-2 border-white/10">
            <AvatarImage src={recruiterAvatar} />
            <AvatarFallback className="bg-gradient-solana text-background font-semibold">
              {recruiterName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{company}</h3>
            <p className="text-sm text-muted-foreground">{recruiterName}</p>
          </div>
        </div>
        <RatingBadge tier={recruiterTier} size="sm" />
      </div>

      {/* Job Title */}
      <h2 className="text-xl font-bold text-foreground mb-2 group-hover:text-gradient transition-colors">
        {title}
      </h2>

      {/* Description */}
      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{description}</p>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.slice(0, 5).map((skill, index) => (
          <span
            key={index}
            className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            {skill}
          </span>
        ))}
        {skills.length > 5 && (
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
            +{skills.length - 5} more
          </span>
        )}
      </div>

      {/* Payment Info */}
      <div className="mb-4 p-4 rounded-xl bg-background/50 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Total Payment</span>
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-secondary" />
            <span className="text-2xl font-bold text-gradient">{totalPayment} SOL</span>
          </div>
        </div>
        <div className="space-y-1">
          {stages.map((stage, index) => (
            <div key={index} className="flex justify-between text-xs text-muted-foreground">
              <span>{stage.name}</span>
              <span className="font-medium">{stage.payment} SOL</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{postedDate}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{applicants} applicants</span>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground"
          onClick={(e) => {
            e.stopPropagation();
            id && navigate(`/jobs/${id}`);
          }}
        >
          View Details
        </Button>
      </div>
    </div>
  );
};
