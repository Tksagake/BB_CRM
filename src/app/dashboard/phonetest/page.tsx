"use client";

import Navbar from "@/components/Navbar";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardCard from "@/components/DashboardCard";
import { supabase } from "../../../../lib/supabaseClient";
import router from "next/router";
let popupWindow; // Variable to hold the reference to the pop-up window
 function openPopup(url: string | URL | undefined) {
            // Open a new window with specified dimensions
			const width = 400;
			const height = 500;
			const top = window.screen.height - height - 30 ;
			const left = window.screen.width - width - 30 ;
			const windowFeatures = `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,location=no`;				
            popupWindow = window.open(url, "PopupWindow",windowFeatures);
 }
const WebRTCPage = () => {
  const handleOpenPopup = () => {
    openPopup("https://kenyavoice.rpdigitalphone.com/Browser-Phone/Phone/indexNew.php?mobile=0794068508");
  };

  return (
    <>
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <h1 className="text-2xl font-semibold mb-4">WebRTC Call Interface</h1>
        <button
          onClick={handleOpenPopup}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Open WebRTC Call Interface
        </button>
      </div>
    </>
  );
};

export default WebRTCPage;
