import { useEffect, useState } from "react";

const stats = [
  { label: "Total Projects", value: 1250, suffix: "+" },
  { label: "Active Freelancers", value: 3400, suffix: "+" },
  { label: "SOL Paid Out", value: 25000, suffix: "+" },
  { label: "Success Rate", value: 94, suffix: "%" },
];

export const Stats = () => {
  const [counters, setCounters] = useState(stats.map(() => 0));

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const interval = duration / steps;

    const increments = stats.map((stat) => stat.value / steps);

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setCounters(
        stats.map((stat, index) =>
          currentStep >= steps
            ? stat.value
            : Math.floor(increments[index] * currentStep)
        )
      );

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-lg modern-card fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-primary mb-2">
                  {counters[index].toLocaleString()}
                  {stat.suffix}
                </div>
                <div className="text-muted-foreground text-sm sm:text-base font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
