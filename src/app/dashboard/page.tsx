"use client";

import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { FiUsers, FiDollarSign, FiTrendingUp, FiCheckCircle } from "react-icons/fi"; // Import icons
import Navbar from "@/components/Navbar";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardCard from "@/components/DashboardCard";
import dayjs from "dayjs";

const supabase = createClientComponentClient();

export default function EnhancedDashboard() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userId, setUserId] = useState("");

  const [debtorsCount, setDebtorsCount] = useState(0);
  const [totalDebtAmount, setTotalDebtAmount] = useState(0);
  const [totalAmountRecovered, setTotalAmountRecovered] = useState(0);
  const [winPercentage, setWinPercentage] = useState(0);
  const [mtdPayments, setMtdPayments] = useState(0);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("users")
        .select("full_name, role, id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user:", error.message);
      } else {
        setUserRole(data.role);
        setUserFullName(data.full_name);
        setUserId(data.id);
      }
    }

    fetchUserData();
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!userRole) return;

      let debtorsQuery = supabase.from("debtors").select("id, debt_amount");
      let paymentsQuery = supabase.from("payments").select("amount, uploaded_at, debtor_id, debtors!inner(client, assigned_to)");

      // Apply filters
      if (userRole === "agent") {
        debtorsQuery = debtorsQuery.eq("assigned_to", userId);
        paymentsQuery = paymentsQuery.eq("debtors.assigned_to", userId);
      } else if (userRole === "client") {
        debtorsQuery = debtorsQuery.eq("client", userFullName);
        paymentsQuery = paymentsQuery.eq("debtors.client", userFullName);
      }

      // Fetch Data
      const [{ data: debtors }, { data: payments }] = await Promise.all([debtorsQuery, paymentsQuery]);

      if (debtors) {
        setDebtorsCount(debtors.length);
        const totalDebt = debtors.reduce((sum, debtor) => sum + debtor.debt_amount, 0);
        setTotalDebtAmount(totalDebt);
      }

      if (payments) {
        const totalRecovered = payments.reduce((sum, payment) => sum + payment.amount, 0);
        setTotalAmountRecovered(totalRecovered);

        // Fix Win % Calculation
        if (totalDebtAmount > 0) {
          setWinPercentage((totalRecovered / totalDebtAmount) * 100);
        }

        // Calculate MTD Payments
        const startOfMonth = dayjs().startOf("month").toISOString();
        const endOfMonth = dayjs().endOf("month").toISOString();
        const mtdPayments = payments.filter(
          (payment) => payment.uploaded_at >= startOfMonth && payment.uploaded_at <= endOfMonth
        ).reduce((total, payment) => total + payment.amount, 0);
        setMtdPayments(mtdPayments);
      }
    }

    fetchDashboardData();
  }, [userRole, userFullName, userId, totalDebtAmount]);

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <DashboardHeader userFullName={userFullName} />

        {/* Admin Dashboard */}
        {userRole === "admin" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <DashboardCard title="Total Debtors" value={debtorsCount} icon={<FiUsers />} onClick={() => router.push("/dashboard/debtors")} />
            <DashboardCard title="Total Debt Amount" value={`KES ${totalDebtAmount.toLocaleString()}`} icon={<FiDollarSign />} onClick={() => router.push("/dashboard/debtors")} />
            <DashboardCard title="Amount Recovered" value={`KES ${totalAmountRecovered.toLocaleString()}`} icon={<FiCheckCircle />} onClick={() => router.push("/dashboard/payments")} />
            <DashboardCard title="Win %" value={`${winPercentage.toFixed(2)}%`} icon={<FiTrendingUp />} onClick={() => router.push("/dashboard/reports/collection-updates")} />
            <DashboardCard title="MTD Payments" value={`KES ${mtdPayments.toLocaleString()}`} icon={<FiTrendingUp />} onClick={() => router.push("/dashboard/payments/payments")} />
          </div>
        )}

        {/* Agent Dashboard */}
        {userRole === "agent" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <DashboardCard title="Total Debt Amount" value={`KES ${totalDebtAmount.toLocaleString()}`} icon={<FiDollarSign />} onClick={() => router.push("/dashboard/debtors")} />
            <DashboardCard title="Amount Recovered" value={`KES ${totalAmountRecovered.toLocaleString()}`} icon={<FiCheckCircle />} onClick={() => router.push("/dashboard/payments")} />
            <DashboardCard title="Win %" value={`${winPercentage.toFixed(2)}%`} icon={<FiTrendingUp />} onClick={() => router.push("/dashboard/reports/collection-updates")} />
            <DashboardCard title="Your PTPs" value={debtorsCount} icon={<FiUsers />} onClick={() => router.push("/dashboard/reports/ptp")} />
            <DashboardCard title="Monthly Target" value={`KES ${(2000000).toLocaleString()}`} icon={<FiTrendingUp />} />
            <DashboardCard title="MTD Payments" value={`KES ${mtdPayments.toLocaleString()}`} icon={<FiTrendingUp />} onClick={() => router.push("/dashboard/payments/agentview")} />
          </div>
        )}

        {/* Client Dashboard */}
        {userRole === "client" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <DashboardCard title="Your Debtors" value={debtorsCount} icon={<FiUsers />} onClick={() => router.push("/dashboard/debtors")} />
            <DashboardCard title="Total Debt Amount" value={`KES ${totalDebtAmount.toLocaleString()}`} icon={<FiDollarSign />} onClick={() => router.push("/dashboard/debtors")} />
            <DashboardCard title="Amount Recovered" value={`KES ${totalAmountRecovered.toLocaleString()}`} icon={<FiCheckCircle />} onClick={() => router.push("/dashboard/payments")} />
            <DashboardCard title="Win %" value={`${winPercentage.toFixed(2)}%`} icon={<FiTrendingUp />} onClick={() => router.push("/dashboard/reports/collection-updates")} />
          </div>
        )}
      </main>
    </div>
  );
}
