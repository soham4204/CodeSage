import React from 'react';

function HeroSection() {
  return (
    <section className="relative h-[calc(100vh-80px)] flex items-center justify-center text-center p-6 bg-cs-black overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cs-black to-gray-800 opacity-80 z-0"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-4 font-exo2">
          Elevate Your Code with <span className="text-cs-red">CodeSage</span>
        </h1>
        <p className="text-xl md:text-2xl text-cs-gray mb-8">
          AI-powered documentation, analysis, and generation for developers.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button className="px-8 py-3 rounded-full bg-cs-red text-white text-lg font-semibold hover:bg-cs-red-dark transition-all duration-300 transform hover:scale-105 shadow-lg font-exo2">
            Get Started Free
          </button>
          <button className="px-8 py-3 rounded-full bg-transparent border-2 border-cs-gray text-cs-gray text-lg font-semibold hover:bg-cs-gray hover:text-cs-black transition-all duration-300 transform hover:scale-105 shadow-lg font-exo2">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;