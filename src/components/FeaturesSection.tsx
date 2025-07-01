import { Brain, FileText, Shield, TrendingUp, Users, Zap } from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      title: "AI-Powered FMECA Generation",
      description:
        "Generate comprehensive Failure Mode, Effects, and Criticality Analysis with industry-specific expertise",
      icon: Brain,
    },
    {
      title: "Instant Document Creation",
      description:
        "Create operational readiness documents, maintenance plans, and compliance reports in minutes",
      icon: FileText,
    },
    {
      title: "Industry Expertise Built-In",
      description:
        "Leverage deep knowledge of mining and heavy industry equipment and failure modes",
      icon: Shield,
    },
    {
      title: "Real-Time Collaboration",
      description:
        "Work together with your team to review, edit, and approve operational readiness documents",
      icon: Users,
    },
    {
      title: "Export & Integration",
      description:
        "Export to Excel, PDF, or integrate directly with your existing systems and workflows",
      icon: TrendingUp,
    },
    {
      title: "Lightning Fast Setup",
      description:
        "Get started in minutes with simple asset list uploads and instant AI analysis",
      icon: Zap,
    },
  ];

  // Fixed random-like rotation angles for each arc (consistent on every load)
  const arcRotations = [61, 174, 299]; // new visually distinct random angles

  return (
    <section
      id="features"
      className="py-20 px-6 bg-background relative overflow-hidden"
    >
      {/* Randomized arc SVGs as geometric background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Arc 1 */}
        <svg
          className="absolute top-8 left-1/3 w-32 h-32 opacity-10"
          style={{ transform: `rotate(${arcRotations[0]}deg)` }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="#0F172A"
            strokeWidth="10"
            strokeLinecap="butt"
          />
        </svg>
        {/* Arc 2 */}
        <svg
          className="absolute bottom-0 right-0 w-48 h-48 opacity-20"
          style={{ transform: `rotate(${arcRotations[1]}deg)` }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="#0F172A"
            strokeWidth="14"
            strokeLinecap="butt"
          />
        </svg>
        {/* Arc 3 */}
        <svg
          className="absolute top-1/2 left-0 w-28 h-28 opacity-10"
          style={{ transform: `rotate(${arcRotations[2]}deg)` }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="#0F172A"
            strokeWidth="8"
            strokeLinecap="butt"
          />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Key Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Designed specifically for mining and heavy industry operational
            excellence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index}>
              <div className="bg-card rounded-lg p-8 h-full border border-border shadow-sm">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>

                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
