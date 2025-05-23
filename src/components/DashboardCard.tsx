"use client";

import React from "react";
import { FiUser } from "react-icons/fi"; // Import an icon from react-icons

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode; // Optional icon prop
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, onClick }) => {
  return (
    <div
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-300 cursor-pointer flex items-center gap-4"
      onClick={onClick}
    >
      {icon && <div className="text-blue-600 text-3xl">{icon}</div>}
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-2xl font-bold text-blue-600 mt-2">{value}</p>
      </div>
    </div>
  );
};

export default DashboardCard;
