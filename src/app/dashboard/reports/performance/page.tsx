"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import router from "next/router";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AgentPerformancePage() {
  const supabase = createClientComponentClient();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // Default: Current Month

  useEffect(() => {
    async function fetchAgentPerformance() {
      setLoading(true);
      const { data: agentData, error } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "agent");

      if (error) {
        console.error("Error fetching agents:", error.message);
        return;
      }

      // Calculate the start and end dates of the selected month
      const startDate = new Date(selectedMonth);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of the month

      // Fetch payments for the selected month
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, debtor_id, amount, payment_date, verified")
        .gte("payment_date", startDate.toISOString())
        .lte("payment_date", endDate.toISOString());

      if (paymentsError) throw paymentsError;

      // Group payments by day and verification status for the chart
      const paymentTrendsMap = new Map<string, { total: number; verified: number }>();
      payments?.forEach((payment) => {
        const date = new Date(payment.payment_date).toISOString().split("T")[0];
        if (paymentTrendsMap.has(date)) {
          const existing = paymentTrendsMap.get(date)!;
          paymentTrendsMap.set(date, {
            total: existing.total + payment.amount,
            verified: existing.verified + (payment.verified ? payment.amount : 0),
          });
        } else {
          paymentTrendsMap.set(date, {
            total: payment.amount,
            verified: payment.verified ? payment.amount : 0,
          });
        }
      });

      // Fetch follow-ups for the selected month
      const { data: followUpData, error: followUpError } = await supabase
        .from("follow_ups")
        .select("*, agent:users(full_name)")
        .gte("follow_up_date", startDate.toISOString())
        .lte("follow_up_date", endDate.toISOString());

      if (followUpError) throw followUpError;

      // Fetch PTP (Promise-To-Pay) logs
      const { data: ptpData, error: ptpError } = await supabase
        .from("ptp")
        .select("*, agent:users(full_name)")
        .gte("ptp_date", startDate.toISOString())
        .lte("ptp_date", endDate.toISOString());

      if (ptpError) throw ptpError;

      // Calculate agent performance based on payments
      const agentPerformanceMap = new Map<string, { payments: number; followUps: number; ptps: number }>();

      for (const payment of payments) {
        // Fetch the debtor to get the assigned agent ID
        const { data: debtorData, error: debtorError } = await supabase
          .from("debtors")
          .select("assigned_to")
          .eq("id", payment.debtor_id)
          .single();

        if (debtorError) throw debtorError;

        const agentId = debtorData.assigned_to;
        const amount = payment.amount;

        if (agentPerformanceMap.has(agentId)) {
          const existing = agentPerformanceMap.get(agentId)!;
          agentPerformanceMap.set(agentId, {
            payments: existing.payments + amount,
            followUps: existing.followUps,
            ptps: existing.ptps,
          });
        } else {
          agentPerformanceMap.set(agentId, {
            payments: amount,
            followUps: 0,
            ptps: 0,
          });
        }
      }

      followUpData?.forEach((followUp) => {
        if (followUp.agent_id) {
          const agentId = followUp.agent_id;
          if (agentPerformanceMap.has(agentId)) {
            const existing = agentPerformanceMap.get(agentId)!;
            agentPerformanceMap.set(agentId, {
              payments: existing.payments,
              followUps: existing.followUps + 1,
              ptps: existing.ptps,
            });
          } else {
            agentPerformanceMap.set(agentId, {
              payments: 0,
              followUps: 1,
              ptps: 0,
            });
          }
        }
      });

      ptpData?.forEach((ptp) => {
        if (ptp.agent_id) {
          const agentId = ptp.agent_id;
          if (agentPerformanceMap.has(agentId)) {
            const existing = agentPerformanceMap.get(agentId)!;
            agentPerformanceMap.set(agentId, {
              payments: existing.payments,
              followUps: existing.followUps,
              ptps: existing.ptps + 1,
            });
          } else {
            agentPerformanceMap.set(agentId, {
              payments: 0,
              followUps: 0,
              ptps: 1,
            });
          }
        }
      });

      // Merge agent performance with agent names
      const agentPerformance = agentData?.map((agent) => ({
        agentId: agent.id,
        agentName: agent.full_name,
        payments: agentPerformanceMap.get(agent.id)?.payments || 0,
        followUps: agentPerformanceMap.get(agent.id)?.followUps || 0,
        ptps: agentPerformanceMap.get(agent.id)?.ptps || 0,
      })) || [];

      setAgents(agentPerformance);
      setLoading(false);
    }

    fetchAgentPerformance();
  }, [supabase, selectedMonth]);

  // Chart Data for Agent Performance Comparison
  const performanceChartData = {
    labels: agents.map((agent) => agent.agentName),
    datasets: [
      {
        label: "Payments Collected (KES)",
        data: agents.map((agent) => agent.payments),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
      {
        label: "Follow-Ups",
        data: agents.map((agent) => agent.followUps),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
      {
        label: "PTPs",
        data: agents.map((agent) => agent.ptps),
        backgroundColor: "rgba(255, 206, 86, 0.6)",
      },
    ],
  };

  return (
    <div className="flex min-h-screen w-full">
       <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Agent Performance</h2>

        {/* Month Selector */}
        <div className="mb-6">
          <label className="block font-medium text-gray-700">Select Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border p-2 rounded-md w-full"
          />
        </div>

        {loading ? (
          <p className="text-center mt-10 text-xl">Loading agent performance...</p>
        ) : (
          <>
            {/* Agent Performance Table */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="px-4 py-2 border">Agent</th>
                    <th className="px-4 py-2 border">Payments Collected</th>
                    <th className="px-4 py-2 border">Follow-Ups</th>
                    <th className="px-4 py-2 border">PTPs</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.agentId} className="border-b">
                      <td className="px-4 py-2 border">{agent.agentName}</td>
                      <td className="px-4 py-2 border">KES {agent.payments.toLocaleString()}</td>
                      <td className="px-4 py-2 border">{agent.followUps}</td>
                      <td className="px-4 py-2 border">{agent.ptps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Agent Performance Comparison Chart */}
            <div className="bg-white p-6 shadow-md rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Agent Performance Comparison</h3>
              <Bar data={performanceChartData} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
