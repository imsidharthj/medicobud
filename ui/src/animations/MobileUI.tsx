import { useEffect, useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

interface MobileUIProps {
  dynamicHeight?: number;
}

const DoctorLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md`}>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5 text-white"
    >
      <circle cx="12" cy="6" r="3" fill="currentColor" />
      <path
        d="M6 20V18C6 15.79 7.79 14 10 14H14C16.21 14 18 15.79 18 18V20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="6" r="2.5" />
      <path
        d="M9 12C9 12 10 13 12 13C14 13 15 12 15 12"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="8.5" cy="11.5" r="0.8" fill="currentColor" />
      <circle cx="15.5" cy="11.5" r="0.8" fill="currentColor" />
      <circle cx="12" cy="16" r="1.5" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M12 13.5V14.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M11.3 16H12.7M12 15.3V16.7" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  </div>
);

const UserLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md`}>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5 text-white"
    >
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path
        d="M6 21V19C6 16.79 7.79 15 10 15H14C16.21 15 18 16.79 18 19V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  </div>
);

const MobileUI: React.FC<MobileUIProps> = ({ dynamicHeight }) => {
  const [showChat, setShowChat] = useState(true);
  const [currentChatMessageIndex, setCurrentChatMessageIndex] = useState(0);
  const dashboardControls = useAnimation();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const chatMessages = [
    { type: 'ai', text: 'Hello! How can I assist you today?' },
    { type: 'user', text: 'I have a headache and feel tired.' },
    { type: 'ai', text: 'Noted. Do you have any fever or nausea?' },
    { type: 'user', text: 'No fever, but a bit nauseous.' },
    { type: 'ai', text: 'Thank you. Based on your symptoms, I can provide some initial insights and suggest next steps.' },
    { type: 'ai', text: 'Would you like to see your health dashboard for a quick overview?' },
  ];

  const chatSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (showChat && currentChatMessageIndex >= 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [currentChatMessageIndex, showChat]);

  useEffect(() => {
    const advanceMessage = () => {
      if (chatSequenceTimeoutRef.current) {
        clearTimeout(chatSequenceTimeoutRef.current);
      }

      if (!showChat) {
        return;
      }

      const nextIndex = currentChatMessageIndex + 1;
      const isLastMessage = nextIndex >= chatMessages.length;
      const delayBeforeNextMessage = 1500;
      const delayBeforeLoopRestart = 3000;

      if (isLastMessage) {
        chatSequenceTimeoutRef.current = setTimeout(() => {
          setShowChat(false);
          dashboardControls.start({ opacity: 1, transition: { duration: 1, ease: 'easeOut' } });

          setTimeout(() => {
            setShowChat(true);
            setCurrentChatMessageIndex(0);
          }, 5000);
        }, delayBeforeLoopRestart);
      } else {
        chatSequenceTimeoutRef.current = setTimeout(() => {
          setCurrentChatMessageIndex(nextIndex);
        }, delayBeforeNextMessage);
      }
    };

    if (showChat) {
      advanceMessage();
    }

    return () => {
      if (chatSequenceTimeoutRef.current) {
        clearTimeout(chatSequenceTimeoutRef.current);
      }
    };
  }, [currentChatMessageIndex, showChat, chatMessages.length, dashboardControls]);

  const heightStyle = dynamicHeight ? { height: `${dynamicHeight}px` } : {};

  return (
    <motion.div
      className="w-[280px] h-[540px] bg-gray-800 rounded-3xl p-2 shadow-2xl relative overflow-hidden flex flex-col border-4 border-gray-300 mx-auto"
      style={heightStyle}
      initial={{ y: '-100%', opacity: 0 }}
      animate={{ y: '0%', opacity: 1 }}
      transition={{
        duration: 1.2,
        ease: [0.175, 0.885, 0.32, 1.275]
      }}
    >
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-700 rounded-b-xl z-10"></div>

      <div className="bg-white rounded-2xl w-full h-full p-4 flex flex-col relative">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <DoctorLogo />
            <span className="text-sm font-medium text-gray-800">Dr. Medicobud</span>
          </div>
          <UserLogo />
        </div>

        <AnimatePresence mode="wait">
          {showChat ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              ref={chatContainerRef}
              className="flex flex-col space-y-2 overflow-y-auto flex-grow text-left scroll-smooth scrollbar-hide"
              style={{ 
                scrollBehavior: 'smooth',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {chatMessages.slice(0, currentChatMessageIndex + 1).map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex items-start gap-2 ${
                    msg.type === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.1 + 0.2 }}
                    className="flex-shrink-0"
                  >
                    {msg.type === 'ai' ? <DoctorLogo /> : <UserLogo />}
                  </motion.div>
                  <p className={`text-sm text-gray-700 p-2 rounded-lg max-w-[80%] ${
                    msg.type === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {msg.text}
                  </p>
                </motion.div>
              ))}
              {currentChatMessageIndex < chatMessages.length - 1 && chatMessages[currentChatMessageIndex + 1].type === 'ai' && (
                <motion.div
                  className="flex items-center space-x-1 h-4 pl-1 self-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-dot"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-dot animation-delay-100"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce-dot animation-delay-200"></div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={dashboardControls}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col flex-grow items-center justify-center p-4"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">Your Health Overview</h3>
              <div className="w-full h-32 bg-gray-100 rounded-lg p-4 flex items-end justify-around space-x-2">
                {[60, 85, 70, 95, 50].map((value, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${value}%`, opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 0.5, ease: 'easeOut' }}
                    className="w-1/5 bg-blue-500 rounded-t-md relative"
                    style={{ height: `${value}%` }}
                  >
                    <span className="absolute -top-6 text-xs text-gray-700 w-full text-center">{value}</span>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-around w-full text-xs text-gray-600 mt-2">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
              </div>
              <p className="text-sm text-gray-600 mt-4">Daily Activity Score</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <input
            type="text"
            placeholder="Type your message..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default MobileUI;