import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Activity, Brain, ClipboardCheck, Stethoscope, Check } from "lucide-react";
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

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-6xl font-serif mb-12 text-black text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center font-sans">
            {/* Step 1 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="rounded-2xl bg-[#F5EFE0] w-[350px] h-[500px]">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-[#2D3648]">
                    1. Open Medicobud when you start feeling unwell
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-end h-[300px]">
                  <img
                    src="/user-sick.png"
                    alt="User feeling unwell"
                    className="object-contain w-[260px] m-auto rounded-2xl mt-19"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="rounded-2xl bg-[#F5EFE0] border-none w-[350px] h-[500px]">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-[#2D3648]">
                    2. Select your risk factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-end h-[300px]">
                  <img
                    src="/mobile-form.png"
                    alt="Mobile form for risk factors"
                    className="object-contain w-[260px] m-auto rounded-2xl mt-4"
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="rounded-2xl bg-[#F5EFE0] border-none w-[350px] h-[500px]">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-[#2D3648]">
                    3. Get response for possible conditions
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-end h-[300px]">
                  <img
                    src="/mobile-response.png"
                    alt="Mobile response"
                    className="object-contain w-[260px] m-auto rounded-2xl mt-3"
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center py-30 px-30 text-white">
        <h2 className="text-6xl font-serif mb-12 text-black">Features</h2>
        <div className="grid md:grid-cols-4 gap-8 w-full px-8">
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
              icon: Stethoscope,
              title: "Doctor Visit",
              description:
                "Use the report to have a more informed discussion with your doctor",
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

// function CheckIcon(props: React.ComponentProps<"svg">) {
//   return (
//     <svg
//       {...props}
//       xmlns="http://www.w3.org/2000/svg"
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       stroke="currentColor"
//       strokeWidth="2"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     >
//       <polyline points="20 6 9 17 4 12" />
//     </svg>
//   );
// }