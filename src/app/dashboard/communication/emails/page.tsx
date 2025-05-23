"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function Page() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching user data:", error?.message || error);
        router.push("/login");
      } else {
        setUserRole(data.role);
        setUserName(data.full_name);
      }
      setLoading(false);
    }

    fetchUserData();
  }, [supabase, router]);

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={function (): Promise<void> {
        throw new Error("Function not implemented.");
      } } />

      <main className="ml-64 flex-1 p-8">
        <h1 className="text-3xl font-bold text-gray-800">
          📍 Page: {window.location.pathname}
        </h1>
        <p className="text-lg text-gray-600">
          Welcome, {userName || "User"} (Role: {userRole ? userRole.toUpperCase() : "Loading..."})
        </p>
        <p className="text-gray-500">This is a placeholder for testing routing.</p>
      </main>
    </div>
  );
}
