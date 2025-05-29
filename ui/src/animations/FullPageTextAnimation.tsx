const FullPageTextAnimation = () => {
  return (
    <section className="h-screen bg-[#f0f0f0] flex items-center justify-center overflow-hidden relative w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row px-8">
        <div className="flex flex-col text-gray-900 font-extrabold leading-none text-left w-full md:w-auto sm:max-w-2xl lg:max-w-4xl">
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
        <div className="md:ml-0 top-0 right-0 lg:max-w-[50px]">
          <p className="sm:text-xl md:text-2xl lg:text-2xl font-medium text-blue-600 text-center md:text-left md:max-w-xs lg:max-w-sm">
            Crafted by Healthcare Practitioners with Real Insight
          </p>
        </div>
      </div>
    </section>
  );
};

export default FullPageTextAnimation;
