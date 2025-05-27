import { useEffect, useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

const MobileUI = () => {
  const [showChat, setShowChat] = useState(true);
  const [currentChatMessageIndex, setCurrentChatMessageIndex] = useState(0);
  const dashboardControls = useAnimation();

  const chatMessages = [
    { type: 'ai', text: 'Hello! How can I assist you today?' },
    { type: 'user', text: 'I have a headache and feel tired.' },
    { type: 'ai', text: 'Noted. Do you have any fever or nausea?' },
    { type: 'user', text: 'No fever, but a bit nauseous.' },
    { type: 'ai', text: 'Thank you. Based on your symptoms, I can provide some initial insights and suggest next steps.' },
    { type: 'ai', text: 'Would you like to see your health dashboard for a quick overview?' },
  ];

  const chatSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <motion.div
      className="w-[280px] h-[500px] md:w-[320px] md:h-[600px] bg-gray-800 rounded-3xl p-2 shadow-2xl relative overflow-hidden flex flex-col border-4 border-gray-300 mx-auto"
      initial={{ y: '-100%', opacity: 0 }}
      animate={{ y: '0%', opacity: 1 }}
      transition={{
        duration: 1.2,
        ease: [0.175, 0.885, 0.32, 1.275]
      }}
    >
      {/* Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-700 rounded-b-xl z-10"></div>

      {/* Inner "Screen" */}
      <div className="bg-white rounded-2xl w-full h-full p-4 flex flex-col relative">
        {/* Top bar with doctor and user profile */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <img src="https://placehold.co/32x32/60A5FA/FFFFFF?text=👨‍⚕️" alt="Doctor" className="w-8 h-8 rounded-full" />
            <span className="text-sm font-medium text-gray-800">Dr. Medicobud</span>
          </div>
          <img src="https://placehold.co/32x32/3B82F6/FFFFFF?text=👤" alt="User" className="w-8 h-8 rounded-full" />
        </div>

        {/* Chat or Dashboard Content */}
        <AnimatePresence mode="wait">
          {showChat ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col space-y-2 overflow-y-auto flex-grow text-left"
            >
              {chatMessages.slice(0, currentChatMessageIndex + 1).map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex items-start gap-2 ${
                    msg.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <motion.img
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.1 + 0.2 }}
                    src={msg.type === 'ai' ? "https://placehold.co/32x32/60A5FA/FFFFFF?text=🤖" : "https://placehold.co/32x32/3B82F6/FFFFFF?text=👤"}
                    alt={msg.type === 'ai' ? "AI Assistant" : "User"}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
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

        {/* Input field at the bottom of the mockup */}
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