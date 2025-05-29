import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

const MedicobudLogo = () => (
  <div className="w-12 h-12 text-[#fff] -ml-3">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="9" x2="12" y2="15" stroke="currentColor" strokeWidth="2" />
      <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  </div>
);

const XIcon = () => (
  <svg
    viewBox="0 0 1200 1227"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
  >
    <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg
    fill="currentColor"
    viewBox="0 0 20 20"
    aria-hidden="true"
    className="w-6 h-6"
  >
    <path
      fillRule="evenodd"
      d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
      clipRule="evenodd"
    />
  </svg>
);

const GitHubIcon = () => (
  <svg
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="w-6 h-6"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

export function Footer() {
  const footerNav = [
    {
      title: 'Product',
      links: [
        { name: 'Records', href: '/diagnosis', isInternal: true },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '/about', isInternal: true },
        { name: 'Contact us', href: 'mailto:imsidharthj@gmail.com', isInternal: false },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Developers', href: 'https://github.com/imsidharthj', isInternal: false },
      ],
    },
  ];

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
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div className="flex flex-col items-start mb-10 md:mb-0">
            <motion.a
              href="/"
              className="flex items-center text-3xl font-bold mb-4 text-white"
              variants={itemVariants}
              whileHover={{ scale: 1.02, color: '#60A5FA' }}
              transition={{ duration: 0.2 }}
            >
              <MedicobudLogo />
              <span className="ml-2">Medicobud</span>
            </motion.a>
            <div className="flex space-x-4">
              <motion.a
                href="https://x.com/imSidharthj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors duration-300"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <XIcon />
              </motion.a>
              <motion.a
                href="https://www.linkedin.com/company/medicobud/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-700 transition-colors duration-300"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <LinkedInIcon />
              </motion.a>
              <motion.a
                href="https://github.com/imsidharthj/medicobud"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-300"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <GitHubIcon />
              </motion.a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-end md:flex-grow">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 md:gap-10">
              {footerNav.map((col, colIndex) => (
                <motion.div key={colIndex} className="flex flex-col items-start md:items-end" variants={itemVariants}>
                  <h4 className="text-lg font-semibold text-white mb-4">{col.title}</h4>
                  <ul className="space-y-2 text-left md:text-right">
                    {col.links.map((link, linkIndex) => (
                      <motion.li key={linkIndex} variants={itemVariants}>
                        {link.isInternal ? (
                          <Link
                            to={link.href}
                            className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-base"
                          >
                            {link.name}
                          </Link>
                        ) : (
                          <motion.a
                            href={link.href}
                            className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-base"
                            target={link.href.startsWith('mailto:') ? undefined : "_blank"}
                            rel={link.href.startsWith('mailto:') ? undefined : "noopener noreferrer"}
                            whileHover={{ x: 5 }}
                          >
                            {link.name}
                          </motion.a>
                        )}
                      </motion.li>
                    ))}
                    {col.title === 'Product' && (
                      <motion.li variants={itemVariants}>
                        <SignedOut>
                          <SignInButton>
                            <button className="text-gray-400 hover:text-blue-400 transition-colors duration-300 text-base">
                              Sign In
                            </button>
                          </SignInButton>
                        </SignedOut>
                        <SignedIn>
                          <div className="text-right md:text-right">
                            <UserButton
                              afterSignOutUrl="/"
                              userProfileUrl="/user-profile"
                            />
                          </div>
                        </SignedIn>
                      </motion.li>
                    )}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 mt-12 pt-8">
          <motion.div variants={itemVariants} className="mb-4 md:mb-0 text-center md:text-left">
            <span>Medicobud@2025</span>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  );
}
export { MedicobudLogo, XIcon, LinkedInIcon, GitHubIcon};