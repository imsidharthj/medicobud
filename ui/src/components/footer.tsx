import { Instagram, Linkedin, Github } from "lucide-react";
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="shadow-2xl mt-20 w-full pt-10 rounded-2xl">
      <div className="container mx-auto py-8 font-light text-center max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left md:pl-35">
          {/* First Column */}
          <div className="md:text-left px-6 md:px-0">
            <h3 className="font-semibold mb-10 text-4xl">Medicobud</h3>
            <ul className="space-y-5">
              <li>
                <Link to="/about" className="hover:text-foreground ">
                  About us
                </Link>
              </li>
              <li>
                <Link to="/interview" className="text-muted-foreground hover:text-foreground">
                  Interview
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Second Column */}
          <div className="px-6 md:px-0">
            <h3 className="font-semibold mb-10 text-4xl">Get in touch</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <Link to="https://www.linkedin.com/in/imsidharthj/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link to="https://github.com/imsidharthj" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Github className="h-5 w-5" />
              </Link>
              <Link to="https://www.instagram.com/its_sid_zyn" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
            <p className="mt-5 text-muted-foreground text-[17px]">
              <Link to="mailto:imsidharthj@gmail.com" className="text-blue-500 hover:underline">contact us</Link>
            </p>
          </div>

          {/* Third Column */}
          <div className="px-6 md:px-0">
            <h3 className="font-semibold mb-10 text-4xl">Learn more</h3>
            <p className="text-muted-foreground text-[17px]">
              Symptom checker technology
            </p>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground block mt-5">
              Privacy Policy
            </Link>
            <Link to="/cookies" className="text-muted-foreground hover:text-foreground block mt-5">
              Cookies Policy
            </Link>
          </div>
        </div>

        {/* Bottom Line Statement */}
        <div className="mt-8 pt-4 text-center text-muted-foreground">
          Infermedica © 2025
        </div>
      </div>
    </footer>
  );
}
