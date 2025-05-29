import React, { useState, useEffect, useRef } from 'react';

interface ChatWidgetProps {
  // Props interface is currently empty. Define any props ChatWidget might accept here.
  // Example:
  // initialMessage?: string;
  // onSendMessage?: (message: string) => void;
}

// Removed 'props' parameter as it's not used and ChatWidgetProps is empty
export const ChatWidget: React.FC<ChatWidgetProps> = () => {
  // State to control the visibility of the initial chat bubble icon
  const [isVisible, setIsVisible] = useState(false);
  // State to control whether the full chat window is open or closed
  const [isOpen, setIsOpen] = useState(false);
  // Ref to ensure the initial slide-in animation only triggers once
  const hasTriggeredOnce = useRef(false);

  useEffect(() => {
    // --- Trigger 1: Page Load (only once) ---
    // If the animation hasn't triggered yet, set a timeout to make the bubble visible
    if (!hasTriggeredOnce.current) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        hasTriggeredOnce.current = true; // Mark as triggered
      }, 2000); // Appear after 2 seconds on page load
      return () => clearTimeout(timer); // Cleanup the timer on unmount
    }

    // --- Trigger 2: Scroll 30% Down ---
    const handleScroll = () => {
      // Only trigger if the chat is not already open and the animation hasn't been triggered by scroll yet
      if (!isOpen && !hasTriggeredOnce.current) {
        // Calculate 30% of the document's scrollable height
        const scrollThreshold = document.documentElement.scrollHeight * 0.3;
        // If the user has scrolled past the threshold
        if (window.scrollY > scrollThreshold) {
          setIsVisible(true); // Make the bubble visible
          hasTriggeredOnce.current = true; // Mark as triggered by scroll
        }
      }
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    // Cleanup the event listener on component unmount or when dependencies change
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOpen]); // Re-run effect if 'isOpen' changes, to re-evaluate scroll logic

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Bubble Icon */}
      {/* This div represents the small, pulsing chat icon */}
      <div
        className={`relative w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl cursor-pointer shadow-lg
          transition-all duration-500 ease-in-out /* Smooth for slide and scale */
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'} /* Controls slide-in from bottom */
          ${isOpen ? 'scale-0 pointer-events-none' : 'scale-100'} /* Hides bubble when chat window is open */
          ${!isOpen && 'animate-pulse-subtle'} /* Applies pulse animation when not open */
        `}
        onClick={() => setIsOpen(true)} // Opens the chat window when clicked
        aria-label="Open chat assistant"
        role="button" // Added role for better accessibility
        tabIndex={0} // Make it focusable
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(true); }} // Keyboard accessibility
      >
        💬 {/* Emoji as a simple icon. Replace with SVG for better control. */}
      </div>

      {/* Chat Window */}
      {/* This div represents the full chat interface */}
      <div
        className={`fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-xl
          transform transition-all duration-500 ease-in-out
          ${isOpen ? 'translate-x-0 translate-y-0 opacity-100' : 'translate-x-full translate-y-full opacity-0 pointer-events-none'} /* Controls slide-in from bottom-right */
          flex flex-col /* Uses flexbox for internal layout (header, content, input) */
        `}
        // Added role and aria-modal for accessibility when open
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? "true" : undefined}
        aria-labelledby="chat-widget-header" // For associating header with dialog
      >
        {/* Chat Window Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h3 id="chat-widget-header" className="font-bold">Health AI Chat</h3>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-xl leading-none hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded" // Added focus styles
            aria-label="Close chat"
          >
            &times;
          </button>
        </div>
        {/* Chat Window Content Area */}
        <div className="p-4 flex-grow overflow-y-auto text-gray-700">
          {/* Example chat messages */}
          <p className="mb-2">Hi there! How can I help you today?</p>
          <p className="mb-2">I can assist with symptom tracking, health history, and general wellness advice.</p>
          <div className="flex justify-end mb-2">
            <span className="bg-blue-100 text-blue-800 p-2 rounded-lg max-w-[70%]">I've had a headache for two days.</span>
          </div>
          <p className="mb-2">AI: Please describe the headache: dull, throbbing, sharp? Any other symptoms like fever, nausea?</p>
        </div>
        {/* Chat Window Input Area */}
        <div className="p-4 border-t border-gray-200">
          <input
            type="text"
            placeholder="Type your message..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Chat message input" // Added aria-label for input
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;
