import React, { useEffect, useState, useMemo } from "react";

interface DashboardHeaderProps {
  userFullName: string;
}

const motivationalQuotes = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Success is not final, failure is not fatal: It is the courage to continue that counts. — Winston Churchill",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
  "Hardships often prepare ordinary people for an extraordinary destiny. — C.S. Lewis",
  "The best way to predict the future is to create it. — Peter Drucker",
  "It does not matter how slowly you go as long as you do not stop. — Confucius",
  "Success is not how high you have climbed, but how you make a positive difference to the world. — Roy T. Bennett",
  "The only limit to our realization of tomorrow will be our doubts of today. — Franklin D. Roosevelt",
  "The best way to get started is to quit talking and begin doing. — Walt Disney",
  "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
  "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
  "You are never too old to set another goal or to dream a new dream. — C.S. Lewis",
  "Sary Networks International LTD wishes you a great day!",
  "Success usually comes to those who are too busy to be looking for it. — Henry David Thoreau",
  "Opportunities don't happen. You create them. — Chris Grosser",
  "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart. — Roy T. Bennett",
];

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ userFullName }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quote, setQuote] = useState("");

  useEffect(() => {
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    const quoteInterval = setInterval(() => {
      setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }, 60000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(quoteInterval);
    };
  }, []);

  useEffect(() => {
    setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  }, [currentTime]);

  const getGreeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);

  return (
    <div className="bg-gradient-to-br from-blue-600 via-purple-500 to-pink-500 p-8 rounded-2xl shadow-2xl mb-6 text-white relative overflow-hidden">
      {/* Floating Glow Effect */}
      <div className="absolute inset-0 bg-white opacity-10 blur-xl"></div>

      {/* Greeting */}
      <h1 className="text-4xl md:text-5xl font-extrabold mb-3 drop-shadow-lg">
        {getGreeting}, {userFullName}!
      </h1>

      {/* Digital Clock */}
      <p className="text-2xl md:text-3xl font-mono font-semibold bg-black bg-opacity-30 px-4 py-2 rounded-lg inline-block tracking-widest shadow-md">
        {formattedTime}
      </p>

      {/* Quote Section with Animation */}
      <p className="text-lg md:text-xl mt-6 italic opacity-80 transition-all duration-700 ease-in-out transform">
        “{quote}”
      </p>
    </div>
  );
};

export default DashboardHeader;
