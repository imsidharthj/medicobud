import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Activity, Brain, ClipboardCheck, BookOpenText, Check } from "lucide-react";
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden w-full">
      {/* Hero Section */}
      <section className="flex items-center justify-center min-h-screen sm:min-h-[90vh] sm:px-8 md:px-16 sm:py-16 md:py-0">
        <div className="grid grid-cols-1 md:grid-cols-2 overflow-hidden max-w-6xl w-full">
          {/* Left Content */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <h1 className="text-gray-900 font-serif text-3xl md:text-5xl lg:text-6xl font-normal leading-tight mb-4 sm:mb-8">
              The symptom checker made by Engineers for
              <span className="text-blue-500"> You</span>
            </h1>
            <ul className="space-y-2 sm:space-y-4  text-base sm:text-lg md:text-xl sm:mb-8">
              {[
                "Analyze your symptoms",
                "Understand your health",
                "Plan your next steps",
                "Get ready for your visit",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 sm:gap-3">
                  <Check className="sm:h-4 sm:w-4 md:h-5 md:w-5 text-green-500 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 md:mt-5 lg:mt-5">
              <Button variant="blueButton" size="lg" className="w-full sm:w-auto text-base sm:text-lg sm:px-8 sm:py-6">
                <Link to="/diagnosis">Start Interview</Link>
              </Button>
            </div>
          </div>
          {/* Right Content */}
          <div className="flex items-center justify-center p-8 md:p-8 lg:p-16">
            <div className="h-auto md:h-125 max-w-6xl sm:max-w-md md:max-w-lg lg:max-w-2xl">
              <img src="/homepage-form.png" alt="MediComate" className="w-full h-auto object-contain rounded-lg sm:rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 md:py-25 px-8 md:px-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="flex flex-col justify-center space-y-4 sm:space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#2D3648] font-serif">About Medicobud</h2>
            <p className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed">
              Medicobud is a free symptom checker tool that uses a healthcare database to help you understand your symptoms and possible conditions.
              It is designed to be easy to use and provide you with the best possible information to help you understand your symptoms.
              We want to help you make informed decisions about your health and well-being.
            </p>
            <div className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed">
              Learn More <span className="text-blue-500 cursor-pointer">about us</span>
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
      </section>

      {/* How it Works Section */}
      <section className="py-20 md:py-20 px-8 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-8 md:mb-16 text-center text-[#2D3648]">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            {[
              ["Open Medicobud when you start feeling unwell", "/user-sick.png"],
              ["Select your risk factors and symptoms", "/homepage-mobile-form-2.png"],
              ["Get response for possible conditions", "/homepage-mobile-response-2.png"]
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-[#F5EFE0] rounded-xl shadow-lg h-[400px] sm:h-[450px] md:h-[500px]">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#2D3648]">
                      {item[0]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="sm:p-6">
                    <div className="relative h-[320px] md:h-[379px] rounded-lg overflow-hidden">
                      <img
                        src={item[1]}
                        alt={item[0]}
                        className="w-full h-full object-contain p-2 sm:p-4"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Medical Library Section */}
      <section className="py-12 sm:py-16 md:py-25 px-8 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="order-2 md:order-1 flex justify-center">
            <img
              src="/homepage-medical-library.png"
              alt="Medical Library"
              className="sm:max-w-sm md:max-w-md lg:max-w-md object-contain rounded-lg sm:rounded-xl"
            />
          </div>
          <div className="order-1 md:order-2 flex flex-col justify-center space-y-4 sm:space-y-6">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#2D3648] font-serif">Medical library</h2>
            <p className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed">
              The right health information leads to the right health actions.
              This library is stocked with tips that can help you stay well and facts
              about medical conditions.
              Just like Medicobud, everything you'll learn here is based on our doctors' clinical 
              experience and the latest research.
            </p>
            <div className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed">
              Browse Now <span className="text-blue-500 cursor-pointer">click here</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="my-16 md:py-20 px-8 md:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif mb-8 sm:mb-12 md:mb-16 text-center text-[#2D3648]">
            Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {[
              {
                icon: ClipboardCheck,
                title: "Fill the Form",
                description: "Enter your symptoms and medical history in our easy-to-use form",
              },
              {
                icon: Brain,
                title: "AI Analysis",
                description: "Our AI system analyzes your symptoms using advanced medical algorithms",
              },
              {
                icon: Activity,
                title: "Get Results",
                description: "Receive a detailed analysis of possible conditions and next steps",
              },
              {
                icon: BookOpenText,
                title: "Keep Yourself Informed",
                description: "Use our medical library to read about various diseases and conditions and their remedies",
              },
            ].map((item) => (
                <div className="bg-blue-500 rounded-lg sm:rounded-xl shadow-xl p-6 sm:p-8 h-full hover:bg-blue-600 transition-colors duration-300">
                  <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                    <div className="mb-2 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-blue-400">
                      <item.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-white">{item.title}</h3>
                    <p className="text-base sm:text-lg text-blue-100">{item.description}</p>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}