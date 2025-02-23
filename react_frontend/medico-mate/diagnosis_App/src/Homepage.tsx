import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Activity, Brain, ClipboardCheck, Stethoscope } from "lucide-react";
// import Link from "next/link";
import { Link } from 'react-router-dom';
// import Image from "next/image";

export default function HomePage() {
  return (
    <div className=" mx-auto space-y-12 py-8 mr-4">
      <section className="container mx-auto grid grid-cols-2 justify-items-center gap-0">

        {/* Left Content - Text and Buttons */}
        <div className="w-150 h-150 bg-red-400">
          <h1 className="text-animated text-gray-900 font-serif text-7xl font-normal leading-none mb-6 ml-text-marg">
            The symptom checker made by doctors for 
            <h1 className="text-blue-500">You</h1>
          </h1>
          <ul className="space-y-2 font-serif,mono text-[20px]">
            <li className="flex items-center gap-2 ">
              <CheckIcon className="h-5 w-5 text-green-500" />
              Analyze your symptoms
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              Understand your health
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              Plan your next steps
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon className="h-5 w-5 text-green-500" />
              Get ready for your visit
            </li>
          </ul>
          <div className="w-47 ml-10 mt-10" >
            <Button variant="secondary" size="lg" className="w-full justify-start gap-2" style={{ backgroundColor: 'red' }}>
              <Link to="/diagnosis">Start Interview</Link>
            </Button>
            {/* <Button variant="outline" size="lg">
              Try Chatbot
            </Button> */}
          </div>
        </div>

        {/* Right Content - Image */}
        <div className="w-100 bg-blue-400">
          <div className="shadow-2xl w-130 h-150 rounded-2xl"><img src="/homepage-form.png" alt="MediComate"/></div>
        </div>
      </section>

      <section className="space-y-8 mt-50 mr-40">
        <h2 className="text-3xl font-bold text-center">How it works</h2>
        <div className="grid md:grid-cols-4 gap-6">
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
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
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