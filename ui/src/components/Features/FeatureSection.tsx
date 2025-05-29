import FeatureCard from './FeatureCard';
import { motion } from 'framer-motion';

const FeaturesSection = () => {
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
    <section className="py-10 md:py-20 px-10 sm:px-8 bg-[#17191c]">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif mb-8 sm:mb-12 md:mb-16 text-center text-white"
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
        >
          Features
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              iconName={feature.iconName}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
