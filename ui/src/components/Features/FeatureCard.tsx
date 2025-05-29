import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

// Helper function to render SVG icons based on a string identifier
const getFeatureIcon = (iconName: string, colorClass = "text-white") => {
  switch (iconName) {
    case 'SymptomAnalysis':
      // AI + Stethoscope with a Human Touch
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-12 h-12 ${colorClass}`}>
          <circle cx="50" cy="35" r="20" stroke="currentColor" strokeWidth="4" /> {/* AI Head */}
          <path d="M40 30L60 40M60 30L40 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> {/* AI Eyes */}
          <path d="M50 55L50 70C50 75 45 80 40 80H30C25 80 20 75 20 70V60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /> {/* Stethoscope handle */}
          <circle cx="20" cy="60" r="8" fill="currentColor" /> {/* Stethoscope head */}
          <path d="M50 70C50 75 55 80 60 80H70C75 80 80 75 80 70V60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /> {/* Stethoscope handle */}
          <circle cx="80" cy="60" r="8" fill="currentColor" /> {/* Stethoscope head */}
          <path d="M50 70L50 85" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /> {/* Connection to human */}
          <circle cx="50" cy="90" r="5" fill="currentColor" /> {/* Human touch point */}
        </svg>
      );
    case 'PersonalizedHealthGuidance':
      // Chat UI with Health Elements
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-12 h-12 ${colorClass}`}>
          <rect x="15" y="15" width="70" height="70" rx="10" stroke="currentColor" strokeWidth="4" /> {/* Chat bubble outline */}
          <path d="M25 35H65M25 45H55M25 55H65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> {/* Chat lines */}
          <circle cx="75" cy="25" r="5" fill="currentColor" /> {/* Small health icon (heart) */}
          <path d="M70 20 L75 25 L70 30 Z" fill="currentColor" /> {/* Arrow for chat direction */}
          <path d="M30 75L40 65L50 75L60 65L70 75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> {/* Health chart line */}
        </svg>
      );
    case 'TrackYourHealthHistory':
      // User Profile with Medical History Timeline (simplified dashboard)
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-12 h-12 ${colorClass}`}>
          <circle cx="50" cy="30" r="15" stroke="currentColor" strokeWidth="4" /> {/* User head */}
          <path d="M35 50C35 40 65 40 65 50L65 70H35L35 50Z" stroke="currentColor" strokeWidth="4" /> {/* User body */}
          <rect x="20" y="70" width="60" height="15" rx="5" fill="currentColor" /> {/* Timeline base */}
          <rect x="25" y="75" width="10" height="5" fill="black" /> {/* Timeline marker 1 */}
          <rect x="40" y="75" width="10" height="5" fill="black" /> {/* Timeline marker 2 */}
          <rect x="55" y="75" width="10" height="5" fill="black" /> {/* Timeline marker 3 */}
          <rect x="70" y="75" width="10" height="5" fill="black" /> {/* Timeline marker 4 */}
          <path d="M20 60 L30 50 L40 60 L50 50 L60 60 L70 50 L80 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> {/* Health trend line */}
        </svg>
      );
    case 'HealthPlanningForEvents':
      // Calendar with travel/medical symbols
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-12 h-12 ${colorClass}`}>
          <rect x="20" y="20" width="60" height="60" rx="8" stroke="currentColor" strokeWidth="4" /> {/* Calendar body */}
          <line x1="20" y1="35" x2="80" y2="35" stroke="currentColor" strokeWidth="4" /> {/* Calendar header line */}
          <circle cx="35" cy="27.5" r="3" fill="currentColor" /> {/* Calendar dot */}
          <circle cx="65" cy="27.5" r="3" fill="currentColor" /> {/* Calendar dot */}
          <path d="M30 50L40 40L50 50L60 40L70 50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> {/* Event markers (mountains/travel) */}
          <path d="M40 65H60M50 65V75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> {/* Medical cross */}
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-12 h-12 ${colorClass}`}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
  }
};

interface FeatureCardProps {
  title: string;
  description: string;
  iconName: string;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, iconName, index }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Motion values for mouse position relative to the card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring animations for smooth mouse following
  const springX = useSpring(mouseX, { stiffness: 200, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 20 });

  // Transform mouse position into rotation values for 3D tilt
  const rotateX = useTransform(springY, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5]);

  // Function to handle mouse move over the card
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!cardRef.current) return;

    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - (left + width / 2)) / (width / 2);
    const y = (event.clientY - (top + height / 2)) / (height / 2);

    mouseX.set(x);
    mouseY.set(y);
  };

  // Variants for on-scroll animation (staggered fade-in and lift)
  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        delay: index * 0.15,
      },
    },
  };

  // Variants for hover effects (lift and subtle scale)
  const hoverVariants = {
    hover: {
      y: -5,
      scale: 1.02,
      boxShadow: "0 15px 30px rgba(255, 255, 255, 0.1)",
      transition: { duration: 0.3, ease: "easeOut" },
    },
    initial: {
      y: 0,
      scale: 1,
      boxShadow: "0 10px 20px rgba(255, 255, 255, 0.05)",
    },
  };

  const [isHealthHistoryExpanded, setIsHealthHistoryExpanded] = useState(false);

  return (
    <motion.div
      ref={cardRef}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onClick={() => {
        if (iconName === 'TrackYourHealthHistory') {
          setIsHealthHistoryExpanded(!isHealthHistoryExpanded);
        }
        console.log(`Clicked on ${title} card!`);
      }}
      style={{
        perspective: 1000,
        rotateX: isHovered ? rotateX : 0,
        rotateY: isHovered ? rotateY : 0,
      }}
      className="relative bg-[#17191c] rounded-xl shadow-xl p-6 sm:p-8 h-full cursor-pointer
                 border border-gray-600 overflow-hidden group"
    >
      {/* Background gradient on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
        initial={{ opacity: 0 }}
        variants={hoverVariants}
      />

      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        {/* Icon Area - Black background with white border and white icon */}
        <div className="mb-4 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-[#17191c] border-2 border-white text-white transition-all duration-300 group-hover:bg-gray-800 group-hover:border-gray-300">
          {getFeatureIcon(iconName, "text-white")}
        </div>

        {/* Title - White text */}
        <h3 className="text-xl sm:text-2xl font-semibold text-white group-hover:text-gray-200 transition-colors duration-300">
          {title}
        </h3>

        {/* Description - Light gray text */}
        <p className="text-base sm:text-lg text-gray-300 group-hover:text-gray-100 transition-colors duration-300">
          {description}
        </p>

        {/* Health Dashboard Micro-interaction */}
        {iconName === 'TrackYourHealthHistory' && (
          <AnimatePresence>
            {isHealthHistoryExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full mt-4 p-4 bg-gray-800 rounded-lg overflow-hidden border border-gray-600"
              >
                <h4 className="font-semibold text-white mb-2">Recent Trends:</h4>
                <div className="flex justify-around items-end h-24">
                  {[40, 70, 55, 80, 65].map((val, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: `${val}%`, opacity: 1 }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                      className="w-1/5 bg-white rounded-t-sm"
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-300 mt-2">Activity Score improving!</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};

export default FeatureCard;
