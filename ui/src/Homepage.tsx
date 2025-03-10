import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Activity, Brain, ClipboardCheck, BookOpenText, Check } from "lucide-react";
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="">
      <section className="flex items-center justify-center min-h-screen p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl overflow-hidden max-w-6xl w-full">
          {/* Left Content - Text and Buttons */}
          <div className="p-6 md:p-12">
            <h1 className="text-gray-900 font-serif text-3xl md:text-6xl font-normal leading-none mb-6">
              The symptom checker made by Engineers for
              <span className="text-blue-500"> You</span>
            </h1>
            <ul className="space-y-4 text-base md:text-xl">
              {[
                "Analyze your symptoms",
                "Understand your health",
                "Plan your next steps",
                "Get ready for your visit",
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-6 w-6 text-green-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 md:mt-10">
              <Button variant="blueButton" size="lg">
                <Link to="/diagnosis">Start Interview</Link>
              </Button>
            </div>
          </div>
          {/* Right Content - Image */}
          <div className="flex items-center justify-center">
            <div className="max-w-6xl h-auto md:h-125 overflow-hidden">
              <img src="/homepage-form.png" alt="MediComate" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 bg-white  overflow-hidden max-w-6xl w-full">
          {/* Left Text Section */}
          <div className="container mx-auto px-8 py-12 md:py-16 flex flex-col justify-center w-[750px]">
            <h1 className="text-[50px] text-[#2D3648] mb-6 font-serif">About Medicobud</h1>
            <p className="text-black text-xl leading-relaxed line-clamp-7">
              Medicobud is a free symptom checker tool that uses a healthcare database to help you understand your symptoms and possible conditions.
              It is designed to be easy to use and provide you with the best possible information to help you understand your symptoms.
              We want to help you make informed decisions about your health and well-being.
              Our goal is to provide you with accurate and reliable information to help you take control of your health.
            </p>
            <div className="mt-6 py-3 text-black rounded-lg transition duration-300">
              Learn More <span className="text-blue-500 cursor-pointer">about us</span>
            </div>
          </div>

          {/* Right Image Section */}
          <div className="flex items-center justify-center">
            <img
              src="/homepage-contact-us.png"
              alt="About Medicobud"
              className="w-60 h-90 object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-8 md:px-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif mb-12 text-black text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center font-sans">
            {[
            ["Open Medicobud when you start feeling unwell", "/user-sick.png"], 
            ["Select your risk factors", "/homepage-mobile-form-2.png"], 
            ["Get response for possible conditions", "/homepage-mobile-response-2.png"]
            ].map((item) => (
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="flex flex-col justify-between items-center bg-[#F5EFE0] rounded-2xl mx-auto w-full max-w-xs h-[500px] pt-4">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-base sm:text-lg md:text-xl lg:text-xl font-bold text-[#2D3648]">
                    {item[0]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={item[1]}
                    alt="User feeling unwell"
                    className="object-contain h-75 rounded-lg w-auto mx-auto"
                  />
                </CardContent>
              </Card>
            </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="items-center justify-center py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-5xl">
          <div className="flex items-center justify-center">
            <img
              src="/homepage-medical-library.png"
              alt="About Medicobud"
              className="w-70 h-50 object-cover"
            />
          </div>
          <div className="container mx-auto md:py-16 flex flex-col justify-center w-[750px]">
            <h1 className="text-[50px] text-[#2D3648] mb-6 font-serif">Medical library</h1>
            <p className="text-black text-xl leading-relaxed line-clamp-6">
              The right health information leads to the right health actions.<br/>
              This library is stocked with tips that can help you stay well and facts<br/> 
              about medical conditions.<br/>
              Just like Medicobud, everything you’ll learn here is based on our doctors’ clinical 
              experience and the latest research.
            </p>
            <div className="mt-6 py-3 text-black rounded-lg transition duration-300">
              Browse Now <span className="text-blue-500 cursor-pointer">click here</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center py-30 px-30 text-white">
        <h2 className="text-6xl font-serif mb-12 text-black">Features</h2>
        <div className="grid md:grid-cols-2 gap-20 w-full px-50">
          {[
            {
              icon: ClipboardCheck,
              title: "Fill the Form",
              description:
                "Enter your symptoms and medical history in our easy-to-use form",
            },
            {
              icon: Brain,
              title: "AI Analysis",
              description:
                "Our AI system analyzes your symptoms using advanced medical algorithms",
            },
            {
              icon: Activity,
              title: "Get Results",
              description:
                "Receive a detailed analysis of possible conditions and next steps",
            },
            {
              icon: BookOpenText,
              title: "Keep YourSelf Informed",
              description:
                "Use Our medical library to read about various diseases and conditions and their remedies",
            },
          ].map((item, index) => (
            <div key={index} className=" bg-blue-500 rounded-lg shadow-xl p-6 hover:bg-green-400 transition duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-white">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}