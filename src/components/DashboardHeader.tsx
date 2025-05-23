import React, { useEffect, useState, useMemo } from "react";

interface DashboardHeaderProps {
  userFullName: string;
}

const motivationalQuotes = [
 
  "Sary Networks International LTD wishes you a great day!",
  "Success is not the key to happiness. Happiness is the key to success. If you love what you are doing, you will be successful.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there.",
  "Success usually comes to those who are too busy to be looking for it.",
  
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
