import { Link } from "react-router-dom";
import { XIcon, LinkedInIcon, GitHubIcon, MedicobudLogo } from './components/footer';

function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f0f0] to-white w-full">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-gray-900 mb-6 leading-tight">
              Your Health, <br />
              <span className="text-blue-600">Smarter & Simpler</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Empowering you with AI-driven insights to understand your health, track your wellness journey, and make informed decisions for a healthier future.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-6">
                Our Mission
              </h2>
              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  We're transforming how people access and understand their health, making healthcare management affordable and accessible in daily life.
                </p>
                <p>
                  As healthcare professionals, we've witnessed the critical gap where diseases remain undiagnosed for extended periods. Many conditions become life-threatening due to delayed diagnosis, often because medical procedures are unaffordable or inaccessible.
                </p>
                <p>
                  Medicobud is our initiative to bridge this gap—democratizing health insights through intelligent technology that puts the power of understanding back into your hands.
                </p>
              </div>
            </div>
            <div className="lg:pl-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-4 pl-3">
                    <MedicobudLogo />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">AI-Powered Health Assistant</h3>
                    <p className="text-blue-600">Available 24/7 for your wellness</p>
                  </div>
                </div>
                <p className="text-gray-700">
                  Instant symptom analysis, personalized health insights, and continuous monitoring—all designed with your privacy and well-being at the forefront.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-gray-900 mb-6">
              What We Offer
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A comprehensive suite of AI-powered tools designed to understand your health and empower better decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Intelligent Symptom Analysis</h3>
              <p className="text-gray-600 leading-relaxed">
                Input your symptoms and receive instant, intelligent analysis to understand possible conditions and next steps.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Context-Aware Guidance</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive personalized recommendations tailored to your unique medical profile and health history.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Health History Tracking</h3>
              <p className="text-gray-600 leading-relaxed">
                Monitor your health trends over time and build a comprehensive record for better long-term care.
              </p>
            </div>
            
          </div>
        </div>
      </section>

      {/* About the Platform Section */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-6">
              About Medicobud
            </h2>
          </div>
          <div className="prose prose-lg mx-auto text-gray-700 leading-relaxed">
            <p className="text-xl mb-6">
              Medicobud is an AI-powered virtual health assistant designed to transform how individuals manage their health journey.
            </p>
            <p className="mb-6">
              Our platform features an intuitive interface that collects your health details, symptoms, and concerns, then analyzes this data to provide potential risk assessments and guidance. We don't just focus on the present—our robust health history tracking allows you to monitor trends over time and make informed decisions for long-term well-being.
            </p>
            <p className="mb-6">
              This combination of real-time analysis, personalized insights, and ongoing health management positions Medicobud as a powerful, user-centric tool for proactive healthcare. As we continue learning and growing, we're constantly enhancing our platform with new features and improved functionality.
            </p>
            <p className="text-lg text-blue-600 font-medium">
              Our vision is simple: democratize healthcare insights and empower everyone to take control of their health journey with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif text-gray-900 mb-4">
              Meet the Founder
            </h2>
            <p className="text-xl text-gray-600">
              Healthcare professional turned developer, passionate about democratizing health insights
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Sidharth Jain
                </h3>
                <p className="text-xl text-blue-600 font-medium mb-4">
                  Programmer • Nurse • Biker
                </p>
              </div>
              
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  I'm Sidharth, a software developer and former nursing professional. As a self-taught programmer with deep healthcare experience, I bridge the gap between medical knowledge and technology innovation.
                </p>
                <p>
                  I started Medicobud to apply my healthcare insights in a real-world technology setting, demonstrating how production-grade applications can solve meaningful problems in healthcare accessibility.
                </p>
                <p>
                  My background in nursing has shown me firsthand how early diagnosis can be life-saving, and how technology can democratize access to health insights that were once only available through expensive medical consultations.
                </p>
              </div>

              <div className="pt-4">
                <p className="text-gray-700 mb-4">
                  I welcome conversations at{" "}
                  <Link 
                    to="mailto:imsidharthj@gmail.com" 
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    imsidharthj@gmail.com
                  </Link>
                </p>
                
                <div className="flex items-center space-x-6">
                  <span className="text-gray-600">Connect with me:</span>
                  <div className="flex space-x-4">
                    <Link 
                      to="https://www.linkedin.com/in/imsidharthj/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-500 hover:text-blue-600 transition-colors p-2"
                    >
                      <LinkedInIcon />
                    </Link>
                    <Link 
                      to="https://github.com/imsidharthj" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-500 hover:text-gray-900 transition-colors p-2"
                    >
                      <GitHubIcon />
                    </Link>
                    <Link 
                      to="https://x.com/imSidharthj" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-gray-500 hover:text-blue-500 transition-colors p-2"
                    >
                      <XIcon />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:pl-8">
              <div className="relative">
                <img 
                  src="/about-me-2.jpg" 
                  alt="Sidharth Jain - Founder of Medicobud" 
                  className="rounded-2xl shadow-lg object-cover w-full h-[500px]"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 md:py-20 px-4 md:px-8 bg-blue-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <Link 
            to="/diagnosis-wizard" 
            className="inline-block bg-white text-blue-600 font-semibold px-8 py-4 rounded-lg hover:bg-gray-50 transition-colors text-lg"
          >
            Start Your Health Analysis
          </Link>
        </div>
      </section>
    </div>
  );
}

export default About;