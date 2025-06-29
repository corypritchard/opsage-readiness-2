const TestimonialSection = () => {
  return (
    <section className="py-20 px-6 bg-muted/30 relative overflow-hidden">
      {/* Randomized arc SVGs as geometric background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Arc 1 */}
        <svg
          className="absolute top-0 left-1/3 w-32 h-32 opacity-10"
          style={{ transform: "rotate(-19deg)" }}
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
          className="absolute bottom-0 right-0 w-44 h-44 opacity-20"
          style={{ transform: "rotate(27deg)" }}
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
          className="absolute top-1/2 left-0 w-24 h-24 opacity-10"
          style={{ transform: "rotate(38deg)" }}
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
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-card rounded-lg p-8 border border-border shadow-sm">
          <blockquote className="text-xl md:text-2xl text-foreground italic mb-6">
            "We cut our operational readiness timeline by 70% using Opsage. What
            used to take weeks now takes hours."
          </blockquote>

          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mr-4">
              <span className="font-semibold">JM</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">John Miller</div>
              <div className="text-sm text-muted-foreground">
                Operations Manager, Mining Corp
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
