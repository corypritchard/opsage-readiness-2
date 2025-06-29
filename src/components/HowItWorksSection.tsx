import { Building, Check, FileText } from "lucide-react";

const HowItWorksSection = () => {
  const steps = [
    {
      number: "1",
      title: "Upload Your Asset List",
      description: "Import tag registers or equipment data from Excel or SAP",
      icon: Building,
    },
    {
      number: "2",
      title: "Generate FMECA with AI",
      description: "Opsage builds a tailored, expert-grade FMECA instantly",
      icon: Check,
    },
    {
      number: "3",
      title: "Export Docs & Tasks",
      description:
        "Download readiness packs, Excel sheets, or SAP-ready formats",
      icon: FileText,
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 px-6 bg-muted/30 relative overflow-hidden"
    >
      {/* Randomized arc SVGs as geometric background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Arc 1 */}
        <svg
          className="absolute top-0 left-1/4 w-40 h-40 opacity-10"
          style={{ transform: "rotate(18deg)" }}
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
          className="absolute bottom-8 right-1/3 w-56 h-56 opacity-20"
          style={{ transform: "rotate(-27deg)" }}
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
          className="absolute top-1/2 left-0 w-32 h-32 opacity-10"
          style={{ transform: "rotate(44deg)" }}
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
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Make operational readiness clear and fast with our 3-step process
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-card rounded-lg p-8 border border-border shadow-sm h-full">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mr-4">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="text-2xl font-bold text-muted-foreground">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>

                <p className="text-muted-foreground">{step.description}</p>
              </div>

              {/* Connector arrow for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <div className="w-8 h-px bg-border"></div>
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-border rotate-45 transform translate-x-1"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
