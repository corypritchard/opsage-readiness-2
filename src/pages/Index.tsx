import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesSection from "@/components/FeaturesSection";
// import IndustrySection from "@/components/IndustrySection";
import ProblemSolutionSection from "@/components/ProblemSolutionSection";
import TestimonialSection from "@/components/TestimonialSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-20">
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        {/* <IndustrySection /> */}
        <ProblemSolutionSection />
        <TestimonialSection />
        <CTASection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
