import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";

const HeroSection = () => {
  const [transform, setTransform] = useState("perspective(1200px)");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateY = ((x - centerX) / centerX) * 12; // max 12deg
    const rotateX = -((y - centerY) / centerY) * 12;
    setTransform(
      `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`
    );
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1200px)");
  };

  return (
    <section className="bg-background py-20 px-4 relative overflow-hidden">
      {/* Geometric background: Multiple arcs with square ends and random rotation */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Arc SVGs with square ends and random rotation */}
        {/* Bottom right */}
        <svg
          className="absolute bottom-0 right-0 w-64 h-64 opacity-20"
          style={{ transform: "rotate(15deg)" }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="#0F172A"
            strokeWidth="16"
            strokeLinecap="butt"
          />
        </svg>
        {/* Top right */}
        <svg
          className="absolute -top-24 right-24 w-48 h-48 opacity-10"
          style={{ transform: "rotate(-22deg)" }}
          viewBox="0 0 200 200"
          fill="none"
        >
          <path
            d="M180,100a80,80 0 1,1 -160,0"
            stroke="#0F172A"
            strokeWidth="12"
            strokeLinecap="butt"
          />
        </svg>
        {/* Bottom left */}
        <svg
          className="absolute bottom-12 -left-24 w-40 h-40 opacity-10"
          style={{ transform: "rotate(33deg)" }}
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
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
        {/* Left: Text & CTA */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Operational Readiness. Accelerated.
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl">
            Opsage structures operational readiness so engineers can deliver
            faster, without sacrificing judgement.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Button size="lg" className="px-8 py-3">
              <ArrowRightLeft className="mr-2 h-5 w-5" />
              Try the Demo
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-3">
              Book a Walkthrough
            </Button>
          </div>
        </div>
        {/* Right: Animated Screenshot with Black Spotlight/Blob */}
        <div className="flex-1 flex justify-center w-full relative">
          {/* Black spotlight/blob (reduced glow) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] bg-black/30 rounded-full blur-xl z-0" />
          <div
            ref={containerRef}
            className="relative z-10 bg-card rounded-xl shadow-lg border border-border overflow-hidden w-full max-w-5xl"
            style={{
              transform,
              willChange: "transform",
              transition: "transform 75ms ease-out",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <img
              src="/lovable-uploads/fmeca-sample.png"
              alt="Opsage FMECA Screenshot"
              className="w-full object-cover pointer-events-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
