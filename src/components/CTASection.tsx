import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 px-6 bg-zinc-900 text-primary-foreground">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-semibold mb-6">
          Ready to Transform Your Operational Readiness?
        </h2>

        <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
          Join mining and industrial leaders who are already saving weeks of
          work with AI-powered FMECA generation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="px-8 py-3 bg-primary-foreground text-primary font-semibold hover:bg-primary-foreground/90 border border-primary-foreground"
          >
            <ArrowRightLeft className="mr-2 h-5 w-5" />
            Try the Demo
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-8 py-3 border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground/10 font-semibold"
          >
            Schedule a Call
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-8 py-3 border-primary-foreground text-primary-foreground bg-transparent hover:bg-primary-foreground/10 font-semibold"
          >
            Get Early Access
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
