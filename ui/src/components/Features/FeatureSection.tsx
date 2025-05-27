import FeatureCard from './FeatureCard'; // Import the FeatureCard component
import { motion } from 'framer-motion'; // For section title animation

const FeaturesSection = () => {
  // Define the data for each feature card
  const features = [
    {
      iconName: 'SymptomAnalysis',
      title: 'Symptom Analysis',
      description: 'Log your symptoms and get instant diagnosis insights powered by advanced AI algorithms.',
    },
    {
      iconName: 'PersonalizedHealthGuidance',
      title: 'Personalized Health Guidance',
      description: 'Receive tailored advice and actionable steps based on your unique health history and goals.',
    },
    {
      iconName: 'TrackYourHealthHistory',
      title: 'Track Your Health History',
      description: 'Effortlessly monitor your health trends, medication adherence, and progress over time with intuitive visuals.',
    },
    {
      iconName: 'HealthPlanningForEvents',
      title: 'Health Planning for Events',
      description: 'Prepare for important life events like travel, exams, or surgeries with smart, proactive health tips.',
    },
  ];

  // Variants for the section title (fade-in from top)
  const titleVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        delay: 0.2,
      },
    },
  };

  return (
    <section className="my-16 md:py-20 px-4 sm:px-8 bg-[#17191c]">
      <div className="max-w-7xl mx-auto">
        {/* Section Title with Animation */}
        <motion.h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif mb-8 sm:mb-12 md:mb-16 text-center text-white"
          variants={titleVariants}
          initial="hidden"
          whileInView="visible" // Animate when title enters viewport
          viewport={{ once: true, amount: 0.5 }} // Only animate once, when 50% visible
        >
          Features
        </motion.h2>

        {/* Grid for Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title} // Use title as key (assuming unique titles)
              title={feature.title}
              description={feature.description}
              iconName={feature.iconName}
              index={index} // Pass index for staggered animation
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
