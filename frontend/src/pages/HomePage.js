import React from 'react';
import HeroSection from '../components/HeroSection'; // We'll render the Hero here

function HomePage() {
  return (
    <>
      <HeroSection />
      {/* You can add more sections like Features, Testimonials etc. here */}
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">More Content Here</h2>
        <p className="text-cs-gray">This is where the rest of your landing page will go.</p>
      </div>
    </>
  );
}

export default HomePage;