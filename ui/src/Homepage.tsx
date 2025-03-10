import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Activity, Brain, ClipboardCheck, Stethoscope } from "lucide-react";
// import Link from "next/link";
import { Link } from 'react-router-dom';
// import Image from "next/image";

export default function HomePage() {
  return (
    <div className="">
      <section className="flex items-center justify-center min-h-screen p-8">
        <div className="grid grid-cols-2 bg-white shadow-2xl rounded-3xl overflow-hidden max-w-6xl w-full">
          {/* Left Content - Text and Buttons */}
          <div className="p-12">
            <h1 className="text-gray-900 font-serif text-6xl font-normal leading-none mb-6">
              The symptom checker made by Engineers for
              <span className="text-blue-500"> You</span>
            </h1>
            <ul className="space-y-4 font-serif text-xl">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-6 w-6 text-green-500" />
                Analyze your symptoms
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-6 w-6 text-green-500" />
                Understand your health
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-6 w-6 text-green-500" />
                Plan your next steps
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-6 w-6 text-green-500" />
                Get ready for your visit
              </li>
            </ul>
            <div className="mt-10">
              <Button variant="secondary" size="lg" style={{ backgroundColor: '#1576d1' }}>
                <Link to="/diagnosis">Start Interview</Link>
              </Button>
            </div>
          </div>

          {/* Right Content - Image */}
          <div className="flex items-center justify-center bg-blue-50">
            <div className="w-96 h-96 shadow-lg rounded-2xl overflow-hidden">
              <img src="/homepage-form.png" alt="MediComate" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-center justify-center py-16 text-white mt-50">
        <h2 className="text-4xl font-bold mb-12 text-blue-400">How it works</h2>
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
            <div key={index} className=" bg-[#1576d1] rounded-lg shadow-xl p-6 hover:bg-green-400 transition duration-300">
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

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}