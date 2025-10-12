import { useState, useEffect } from "react";
import { JobCard } from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  total_payment: number;
  created_at: string;
  views_count: number;
  recruiter_name: string;
  company_name: string | null;
  recruiter_avatar: string | null;
  recruiter_tier: "gold" | "silver" | "bronze" | "iron";
  applicants_count: number;
}

interface Filters {
  searchQuery: string;
  minPayment: number;
  maxPayment: number;
  skills: string[];
  tiers: string[];
  sortBy: string;
}

interface JobDashboardProps {
  showHeader?: boolean;
}

export const JobDashboard = ({ showHeader = true }: JobDashboardProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);

  const [filters, setFilters] = useState<Filters>({
    searchQuery: "",
    minPayment: 0,
    maxPayment: 1000,
    skills: [],
    tiers: [],
    sortBy: "newest",
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, filters]);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      // Fetch jobs using our API client
      const { data, error } = await supabase.jobs.getAll({
        status: "open",
        limit: 100 // Fetch more jobs for better filtering
      });

      if (error) throw new Error(error);

      // Transform data to match our interface
      const transformedJobs = (data || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        skills: job.skills || [],
        total_payment: job.total_payment,
        created_at: job.created_at,
        views_count: job.views_count || 0,
        recruiter_name: job.recruiter?.full_name || "Unknown",
        company_name: job.recruiter?.company_name || null,
        recruiter_avatar: job.recruiter?.avatar_url || null,
        recruiter_tier: "iron", // Default tier since we don't have this in the API response
        applicants_count: job.applicants_count || 0,
      }));

      setJobs(transformedJobs);

      // Extract unique skills for filter
      const allSkills = transformedJobs.flatMap((job: Job) => job.skills);
      const uniqueSkills = Array.from(new Set(allSkills));
      setAvailableSkills(uniqueSkills);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    }

    // Payment range filter
    filtered = filtered.filter(
      (job) =>
        job.total_payment >= filters.minPayment &&
        job.total_payment <= filters.maxPayment
    );

    // Skills filter
    if (filters.skills.length > 0) {
      filtered = filtered.filter((job) =>
        filters.skills.some((skill) => job.skills.includes(skill))
      );
    }

    // Tier filter
    if (filters.tiers.length > 0) {
      filtered = filtered.filter((job) =>
        filters.tiers.includes(job.recruiter_tier)
      );
    }

    // Sorting
    switch (filters.sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "highest_paid":
        filtered.sort((a, b) => b.total_payment - a.total_payment);
        break;
      case "most_applicants":
        filtered.sort((a, b) => b.applicants_count - a.applicants_count);
        break;
    }

    setFilteredJobs(filtered);
  };

  const updateFilter = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSkillFilter = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const toggleTierFilter = (tier: string) => {
    setFilters((prev) => ({
      ...prev,
      tiers: prev.tiers.includes(tier)
        ? prev.tiers.filter((t) => t !== tier)
        : [...prev.tiers, tier],
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      minPayment: 0,
      maxPayment: 1000,
      skills: [],
      tiers: [],
      sortBy: "newest",
    });
  };

  const hasActiveFilters =
    filters.skills.length > 0 ||
    filters.tiers.length > 0 ||
    filters.minPayment > 0 ||
    filters.maxPayment < 1000;

  const formatPostedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <section className={showHeader ? "py-20 relative" : "relative"} id={showHeader ? "jobs" : undefined}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        {showHeader && (
          <div className="mb-12 fade-in">
            <h2 className="text-4xl font-bold mb-4">
              Discover <span className="text-gradient">Opportunities</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Find the perfect project and start earning in SOL
            </p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 fade-in">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search jobs, skills, or companies..."
                className="pl-12 h-12 glass border-white/10 focus:border-primary/50"
                value={filters.searchQuery}
                onChange={(e) => updateFilter("searchQuery", e.target.value)}
              />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="glass border-white/10 h-12 px-6">
                  <SlidersHorizontal className="w-5 h-5 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <Badge className="ml-2 bg-primary">
                      {filters.skills.length + filters.tiers.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>

              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle>Filter Jobs</SheetTitle>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto p-1"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Sort By */}
                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select
                      value={filters.sortBy}
                      onValueChange={(value) => updateFilter("sortBy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="highest_paid">Highest Paid</SelectItem>
                        <SelectItem value="most_applicants">Most Applicants</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Range */}
                  <div className="space-y-4">
                    <Label>Payment Range (SOL)</Label>
                    <div className="pt-2">
                      <Slider
                        min={0}
                        max={1000}
                        step={10}
                        value={[filters.minPayment, filters.maxPayment]}
                        onValueChange={([min, max]) => {
                          updateFilter("minPayment", min);
                          updateFilter("maxPayment", max);
                        }}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>{filters.minPayment} SOL</span>
                        <span>{filters.maxPayment} SOL</span>
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Tier */}
                  <div className="space-y-2">
                    <Label>Recruiter Rating</Label>
                    <div className="space-y-2">
                      {["gold", "silver", "bronze", "iron"].map((tier) => (
                        <div key={tier} className="flex items-center space-x-2">
                          <Checkbox
                            id={tier}
                            checked={filters.tiers.includes(tier)}
                            onCheckedChange={() => toggleTierFilter(tier)}
                          />
                          <label
                            htmlFor={tier}
                            className="text-sm font-medium capitalize cursor-pointer"
                          >
                            {tier}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  {availableSkills.length > 0 && (
                    <div className="space-y-2">
                      <Label>Skills (Top 10)</Label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableSkills.slice(0, 10).map((skill) => (
                          <div key={skill} className="flex items-center space-x-2">
                            <Checkbox
                              id={skill}
                              checked={filters.skills.includes(skill)}
                              onCheckedChange={() => toggleSkillFilter(skill)}
                            />
                            <label
                              htmlFor={skill}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {skill}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter("sortBy", value)}
            >
              <SelectTrigger className="w-[180px] glass border-white/10 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="highest_paid">Highest Paid</SelectItem>
                <SelectItem value="most_applicants">Most Applicants</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {(filters.skills.length > 0 || filters.tiers.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="pl-2 pr-1 py-1"
                >
                  {skill}
                  <button
                    onClick={() => toggleSkillFilter(skill)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {filters.tiers.map((tier) => (
                <Badge
                  key={tier}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 capitalize"
                >
                  {tier} Tier
                  <button
                    onClick={() => toggleTierFilter(tier)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {loading ? "Loading..." : `${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""} found`}
        </div>

        {/* Job Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[400px] rounded-2xl glass border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                id={job.id}
                title={job.title}
                company={job.company_name || job.recruiter_name}
                recruiterName={job.recruiter_name}
                recruiterAvatar={job.recruiter_avatar || undefined}
                recruiterTier={job.recruiter_tier}
                description={job.description}
                skills={job.skills}
                totalPayment={job.total_payment}
                stages={[
                  { name: "Stage 1", payment: job.total_payment * 0.33 },
                  { name: "Stage 2", payment: job.total_payment * 0.33 },
                  { name: "Stage 3", payment: job.total_payment * 0.34 },
                ]}
                postedDate={formatPostedDate(job.created_at)}
                applicants={job.applicants_count}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              No jobs found matching your criteria
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
