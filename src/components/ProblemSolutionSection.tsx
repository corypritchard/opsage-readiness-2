const ProblemSolutionSection = () => {
  // Fixed random-like rotation angles for each arc (consistent on every load)
  const arcRotations = [12, 188, 321]; // new visually distinct random angles

  return (
    <section className="py-20 px-6 bg-background relative overflow-hidden">
      {/* Randomized arc SVGs as geometric background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Arc 1 */}
        <svg
          className="absolute top-0 left-1/2 w-48 h-48 opacity-10"
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
          className="absolute bottom-0 right-1/4 w-64 h-64 opacity-20"
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
          className="absolute top-1/3 left-0 w-40 h-40 opacity-10"
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
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="bg-destructive/10 rounded-lg p-8 border-l-4 border-destructive border border-border shadow-sm">
            <h3 className="text-xl font-semibold text-destructive mb-4">
              Before Opsage
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-destructive mr-2">✗</span>
                <span className="text-destructive/80">
                  Spreadsheets everywhere, no standardization
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-destructive mr-2">✗</span>
                <span className="text-destructive/80">
                  Hours of workshops with mixed results
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-destructive mr-2">✗</span>
                <span className="text-destructive/80">
                  No reusable logic or knowledge capture
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-destructive mr-2">✗</span>
                <span className="text-destructive/80">
                  Weeks to complete operational readiness
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-8 border-l-4 border-green-500 border border-border shadow-sm">
            <h3 className="text-xl font-semibold text-green-700 mb-4">
              With Opsage
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-green-700">
                  Instant FMECAs with industry expertise
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-green-700">
                  Repeatable logic you can trust
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-green-700">
                  Auditable exports ready for compliance
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span className="text-green-700">
                  Minutes to generate comprehensive docs
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolutionSection;
