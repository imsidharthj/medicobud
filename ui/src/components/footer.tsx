import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Github, X, Sun, Moon } from "lucide-react";

// Reusing your Medicobud Logo SVG component
const MedicobudLogo = () => (
  <div className="w-12 h-12 text-[#fff]"> {/* Increased logo size from w-10 to w-12 */}
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  </div>
);

export function Footer() {
  const [isDarkMode, setIsDarkMode] = useState(true); // Theme toggle state remains

  // Data for navigation columns, matching the reference image's structure
  const footerNav = [
    {
      title: 'Product',
      links: [
        { name: 'Sign in', href: '#' },
        { name: 'Records', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '#' },
        { name: 'Contact us', href: '#' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Developers', href: '#' },
      ],
    },
  ];

  // Framer Motion variants for the entire footer (on-scroll fade-in)
  const footerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
        staggerChildren: 0.1,
      },
    },
  };

  // Framer Motion variants for individual links/items (staggered fade-in)
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.footer
      className={`w-full py-12 md:py-16 bg-[#17191c] text-gray-300 font-['Space_Grotesk',_ui-sans-serif,_system-ui,_sans-serif,_\"Apple_Color_Emoji\",_\"Segoe_UI_Emoji\",_\"Segoe_UI_Symbol\",_\"Noto_Color_Emoji\"] transition-colors duration-500`}
      variants={footerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Top Section: Logo/Socials (left) and Nav Links (right) */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8"> {/* Removed border-b, pb-8 */}
          {/* Left Column: Logo and Social Media Icons */}
          <div className="flex flex-col items-start mb-10 md:mb-0">
            <motion.a
              href="/"
              className="flex items-center text-3xl font-bold mb-4 text-white" /* Increased text size from text-2xl to text-3xl */
              variants={itemVariants}
              whileHover={{ scale: 1.02, color: '#60A5FA' }}
              transition={{ duration: 0.2 }}
            >
              <MedicobudLogo />
              <span className="ml-2">Medicobud</span>
            </motion.a>
            <div className="flex space-x-4">
              <motion.a
                href="#" // Replace with your X/Twitter link
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-300"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <X className="h-6 w-6" />
              </motion.a>
              <motion.a
                href="#" // Replace with your LinkedIn link
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-300"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <Linkedin className="h-6 w-6" />
              </motion.a>
              <motion.a
                href="#" // Replace with your LinkedIn link
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-300"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <Github className="h-6 w-6" />
              </motion.a>
              {/* Removed Github and Instagram as they are not in the reference image's top section */}
            </div>
          </div>

          {/* Right Columns: Navigation Links - Grouped and aligned to the right */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-end md:flex-grow">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-10">
              {footerNav.map((col, colIndex) => (
                <motion.div key={colIndex} className="flex flex-col items-start md:items-end" variants={itemVariants}> {/* md:items-end for right alignment on medium+ screens */}
                  <h4 className="text-lg font-semibold text-white mb-4">{col.title}</h4>
                  <ul className="space-y-2 text-left md:text-right"> {/* md:text-right for right alignment on medium+ screens */}
                    {col.links.map((link, linkIndex) => (
                      <motion.li key={linkIndex} variants={itemVariants}>
                        <motion.a
                          href={link.href}
                          className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-base"
                          whileHover={{ x: 5 }}
                        >
                          {link.name}
                        </motion.a>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Copyright, Legal, Theme Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 mt-12 pt-8"> {/* Added top border for separation, mt-12, pt-8 */}
          <motion.div variants={itemVariants} className="mb-4 md:mb-0 text-center md:text-left">
            <span>Medicobud@2025</span> {/* Updated text */}
          </motion.div>

          {/* Light/Dark Mode Toggle */}
          <motion.div variants={itemVariants} className="flex items-center space-x-2">
            <span className="text-gray-400">Light</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative w-14 h-8 rounded-full flex items-center px-1 transition-colors duration-500
                ${isDarkMode ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}
              `}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={isDarkMode ? "moon" : "sun"}
                  layout
                  transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                  className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  {isDarkMode ? (
                    <Moon className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Sun className="w-4 h-4 text-gray-700" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
            <span className="text-gray-400">Dark</span>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  );
}
