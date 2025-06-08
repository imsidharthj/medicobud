import { Button } from "./components/ui/button";
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useUser } from '@clerk/clerk-react'; // Import useUser
import { useState } from 'react'; // Import useState
import MobileUI from "./animations/MobileUI";
import FeaturesSection from "./components/Features/FeatureSection";
import HowItWorksScroll from "./animations/HowItWorksScroll";
import FullPageTextAnimation from "./animations/FullPageTextAnimation";
import { DiagnosisStartModal } from "./components/diagnosis/DiagnosisStartModal"; // Import the modal

const CustomCheckIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="sm:h-5 sm:w-5 md:h-6 md:w-6 flex-shrink-0"
  >
    <circle cx="12" cy="12" r="10" fill="black" />
    <path
      d="M7.5 12.5L10.5 15.5L16.5 9.5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function HomePage() {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartAnalysisClick = () => {
    if (isSignedIn) {
      navigate('/diagnosis-wizard');
    } else {
      setIsModalOpen(true);
    }
  };

  const handleContinueAsGuest = () => {
    setIsModalOpen(false);
    // Navigate to DiagnosisWizard and pass a state to indicate guest mode
    navigate('/diagnosis-wizard', { state: { isGuestMode: true } });
  };

  return (
    <div className="overflow-x-hidden w-full bg-[#f0f0f0]">
      {/* Hero Section */}
      <section className="flex items-center justify-center min-h-screen sm:min-h-[90vh] sm:py-16 md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden max-w-6xl w-full mx-auto">
          {/* Left Content */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <h1 className="text-gray-900 font-serif text-3xl md:text-5xl lg:text-6xl font-normal leading-tight mb-4 sm:mb-2">
              Your AI-Powered Virtual Personal Health Assistant
            </h1>
            <p className="text-gray-400 text-lg sm:text-xl md:text-[15px] mb-4 sm:mb-4">
              Track Symptoms, Get Diagnoses, and Plan Your Health Journey with Ease
            </p>
            <ul className="space-y-2 sm:space-y-4  text-base sm:text-lg md:text-xl sm:mb-3">
              {[
                "Symptom Input & Analysis",
                "Context-Aware Guidance",
                "Health History Tracking",
                "Proactive Planning",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 sm:gap-3">
                  <CustomCheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 md:mt-5 lg:mt-5">
              {/* Updated Button */}
              <Button
                variant="blueButton"
                size="lg"
                className="w-full sm:w-auto text-base sm:text-lg sm:px-8 sm:py-6"
                onClick={handleStartAnalysisClick} // Use the handler
              >
                Start Analysis
              </Button>
            </div>
          </div>
          {/* Right Content - Padding already matches left content's internal padding */}
          <div className="flex items-center justify-center p-8 md:p-12 lg:p-16">
            <MobileUI />
          </div>
        </div>
      </section>

      <FeaturesSection />

      <FullPageTextAnimation />

      <HowItWorksScroll />

      {/* About Section - Apply similar consistent container and padding if needed for alignment */}
      <section className="py-16 md:py-25">
        <div className="max-w-6xl mx-auto px-8 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4 sm:space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#2D3648] font-serif">About Medicobud</h2>
              <p className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed">
                Medicobud is a free symptom checker tool that uses a healthcare database to help you understand your symptoms and possible conditions.
                It is designed to be easy to use and provide you with the best possible information to help you understand your symptoms.
                We want to help you make informed decisions about your health and well-being.
              </p>
              <div className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed">
                Learn More <Link to="/about" className="text-blue-500 cursor-pointer hover:text-blue-600 hover:underline">about us</Link>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src="/homepage-contact-us.png"
                alt="About Medicobud"
                className="w-full md:h-[350px] object-contain rounded-lg sm:rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>
      {/* Render the modal */}
      <DiagnosisStartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onContinueAsGuest={handleContinueAsGuest}
      />
    </div>
  );
}