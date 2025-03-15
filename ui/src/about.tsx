import { Link } from "react-router-dom";
import { Instagram, Linkedin, Github } from "lucide-react";

function About() {
  return (
    <section className="py-8 md:py-16 px-4 md:px-8 sm:ml-10 md:ml-50 md:mr-10">
      <div className="container mx-auto overflow-hidden w-full max-w-6xl">
        {/* Header */}
        <div className="flex justify-center items-center mb-8 md:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800">
            Sidharth Jain
          </h1>
        </div>

        {/* About Me */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="space-y-4 text-gray-700">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold">
              Programmer / Nurse / Biker
            </h2>
            <p className="text-sm md:text-base">
              I am Sidharth, a software developer and a former nursing official. I am a self-taught programmer who has a passion for programming and healthcare.
            </p>
            <p className="text-sm md:text-base">
              I welcome emails at <Link to="mailto:imsidharthj@gmail.com" className="text-blue-500 hover:underline">imsidharthj@gmail.com</Link>
            </p>
            <div className="flex items-center space-x-4 mt-4">
              <span className="text-sm md:text-base">You can also find me on:</span>
              <Link to="https://www.linkedin.com/in/imsidharthj/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 transition-colors">
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link to="https://github.com/imsidharthj" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 transition-colors">
                <Github className="h-5 w-5" />
              </Link>
              <Link to="https://www.instagram.com/its_sid_zyn" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 transition-colors">
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
            <p className="text-sm md:text-base">
              I am always looking for new opportunities to learn and grow as a programmer and as a person.
            </p>
          </div>
          <div className="aspect-square max-w-md mx-auto">
            <img src="/about-me-2.jpg" alt="Sidharth Jain" className="rounded-lg shadow-md object-cover w-full h-full" />
          </div>
        </div>

        {/* Medicobud */}
        <div className="border-t border-gray-200 pt-8 mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
            Medicobud
          </h2>
          <div className="grid grid-cols-1 gap-8 items-center">
            <div className="text-sm md:text-base text-gray-700 space-y-3">
              <p>
                Medicobud is a symptom analysis tool that helps users identify potential health risks based on their symptoms.
              </p>
              <p>
                As a healthcare professional, I have witnessed a major issue where diseases remain undiagnosed for extended periods.
              </p>
              <p>
                Many conditions become life-threatening due to the lack of early diagnosis, often because of unaffordable medical procedures.
              </p>
              <p>
                Medicobud is a small initiative aimed at addressing this problem. The vision of Medicobud is both user-centric and organization-centric.
              </p>
              <p>
                I started Medicobud to apply my knowledge in a real-world setting and demonstrate how a production-grade application works.
              </p>
              <p>
                Medicobud features a user-friendly interface that collects user details, symptoms, and concerns, then analyzes the data to provide potential risk factors or diagnoses.
              </p>
              <p>
                As I continue learning and growing, I will keep enhancing Medicobud by adding new features and improving its functionality.
              </p>
            </div>
          </div>
        </div>

        {/* Programmer */}
        <div className="border-t border-gray-200 pt-8 mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
            Programmer
          </h2>
          <div className="text-sm md:text-base text-gray-700 space-y-3">
            <p>
              I am on the mission of lifelong learning. I am a self-taught programmer who enjoys learning new things and solving problems.
            </p>
            <p>
              After taking a break from nursing, I decided to pursue my passion for programming.
              I started learning to code on my own and quickly fell in love with it.
            </p>
            <p>
              I started my programming journey by learning Python with David J. Malan's course on CS50 Introduction to Programming.
              After tasting the tip of the world of computer science, I decided to dive deeper into the world of programming.
            </p>
            <p>
              I discovered how we can use programming to solve real-world problems and make a positive impact on the world.
            </p>
            <p>
              Over the last year, I have explored various programming languages and technologies, including Java, DSA, JavaScript, React, and Node.js.
              I have also worked on a variety of projects, including API, development pipeline, web applications, command-line tools, and data structures.
            </p>
          </div>
        </div>

        {/* Nurse */}
        <div className="border-t border-gray-200 pt-8 mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
            Nurse
          </h2>
          <div className="text-sm md:text-base text-gray-700 space-y-3">
            <p>
              I am a former nursing professional with a deep passion for healthcare and patient well-being. My journey in nursing has always been driven by a strong desire to help others and make a meaningful impact in people’s lives.
            </p>
            <p>
              Throughout my career, I have worked in the neurology department and intensive care units of multispecialty hospitals. I have extensive experience handling critical cases and responding swiftly to life-threatening situations on a daily basis.
            </p>
            <p>
              I have had the privilege of caring for patients of all ages and backgrounds, which has given me a profound understanding of the healthcare system and the diverse needs of patients.
            </p>
            <p>
              My passion lies in providing high-quality care and supporting patients in achieving their health goals. Now, I am excited to merge my nursing expertise with my programming skills to develop innovative solutions that enhance patient care and improve healthcare outcomes.
            </p>
          </div>
        </div>

        {/* Photos */}
        <div className="border-t border-gray-200 max-w-md">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mt-12">Photos</h2>
            <img src="/about-me.jpg" alt="Sidharth Jain" className="rounded-lg shadow-md object-cover w-full h-full" />
        </div>
      </div>
    </section>
  );
}

export default About;