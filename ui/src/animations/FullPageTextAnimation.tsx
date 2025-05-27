const FullPageTextAnimation = () => {
  return (
    <section className="h-screen bg-[#f0f0f0] flex items-center justify-center overflow-hidden px-4 md:px-8 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end md:justify-start w-full">
        <div className="flex flex-col text-gray-900 font-extrabold leading-none text-left w-full md:w-auto">
          <div className="relative overflow-hidden">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem]">
              Your Health,
            </h1>
          </div>
          <div className="relative overflow-hidden">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem]">
              Our Focus
            </h1>
          </div>
        </div>

        <p className="mt-8 md:mt-0 md:ml-12 text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-blue-600 text-center md:text-left md:max-w-xs lg:max-w-sm">
          Crafted by Healthcare Practitioners with Real Insight
        </p>
      </div>

      {/* <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-500 opacity-100 y-0">
        <span className="text-sm mb-1">Scroll Down</span>
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          ></path>
        </svg>
      </div> */}
    </section>
  );
};

export default FullPageTextAnimation;
