import { Tractor } from "lucide-react";

const IndustrySection = () => {
  const industries = ["Mining", "Water Utilities", "Oil & Gas", "Renewables"];
  const equipment = ["Pumps", "Screens", "Conveyors", "Mills", "Filters"];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="flex flex-col items-center mb-4">
          <div className="bg-primary/10 text-primary rounded-full p-4 mb-4 shadow-sm">
            <Tractor className="h-8 w-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            Built for Mining & Heavy Industry
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Deep industry knowledge and equipment expertise that generic AI
            tools simply can't match
          </p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        {/* Industries Card */}
        <div className="bg-card rounded-xl shadow border border-border p-8 flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-4">Industries We Serve</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            {industries.map((industry) => (
              <span
                key={industry}
                className="px-4 py-2 rounded-full bg-muted text-foreground text-base font-medium border border-border"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>
        {/* Equipment Card */}
        <div className="bg-card rounded-xl shadow border border-border p-8 flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-4">
            Equipment Types Supported
          </h3>
          <ul className="space-y-2 text-left">
            {equipment.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <span className="inline-block w-2 h-2 bg-primary rounded-full" />
                <span className="text-base">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default IndustrySection;
