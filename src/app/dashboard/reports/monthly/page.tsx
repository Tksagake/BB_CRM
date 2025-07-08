"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";
import { Bar } from "react-chartjs-2";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
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

export default function MonthlyReportsPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // Default to current month
  const [clientDebts, setClientDebts] = useState<any[]>([]);
  const [paymentTrends, setPaymentTrends] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [ptpLogs, setPtpLogs] = useState<any[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [month]);

  async function fetchData() {
    setLoading(true);
    try {
      // Calculate the start and end dates of the selected month
      const startDate = new Date(month);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of the month

      // Fetch all agents
      const { data: agentsData, error: agentsError } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "agent");

      if (agentsError) throw agentsError;

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

      const paymentTrends = Array.from(paymentTrendsMap.entries()).map(([date, data]) => ({
        uploaded_at: date,
        total: data.total,
        verified: data.verified,
      }));

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

      // Fetch call logs for the selected month
      const { data: callLogsData, error: callLogsError } = await supabase
        .from("call_logs")
        .select("*")
        .gte("start_time", startDate.toISOString())
        .lte("start_time", endDate.toISOString());

      if (callLogsError) throw callLogsError;

      // Calculate agent performance based on payments, follow-ups, PTPs, and calls
      const agentPerformanceMap = new Map<string, { payments: number; followUps: number; ptps: number; calls: number }>();

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
            calls: existing.calls,
          });
        } else {
          agentPerformanceMap.set(agentId, {
            payments: amount,
            followUps: 0,
            ptps: 0,
            calls: 0,
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
              calls: existing.calls,
            });
          } else {
            agentPerformanceMap.set(agentId, {
              payments: 0,
              followUps: 1,
              ptps: 0,
              calls: 0,
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
              calls: existing.calls,
            });
          } else {
            agentPerformanceMap.set(agentId, {
              payments: 0,
              followUps: 0,
              ptps: 1,
              calls: 0,
            });
          }
        }
      });

      callLogsData?.forEach((callLog) => {
        if (callLog.receiver_name) {
          const agent = agentsData?.find(agent => agent.full_name === callLog.receiver_name);
          if (agent) {
            const agentId = agent.id;
            if (agentPerformanceMap.has(agentId)) {
              const existing = agentPerformanceMap.get(agentId)!;
              agentPerformanceMap.set(agentId, {
                payments: existing.payments,
                followUps: existing.followUps,
                ptps: existing.ptps,
                calls: existing.calls + 1,
              });
            } else {
              agentPerformanceMap.set(agentId, {
                payments: 0,
                followUps: 0,
                ptps: 0,
                calls: 1,
              });
            }
          }
        }
      });

      // Merge agent performance with agent names
      const agentPerformance = agentsData?.map((agent) => ({
        agentId: agent.id,
        agentName: agent.full_name,
        payments: agentPerformanceMap.get(agent.id)?.payments || 0,
        followUps: agentPerformanceMap.get(agent.id)?.followUps || 0,
        ptps: agentPerformanceMap.get(agent.id)?.ptps || 0,
        calls: agentPerformanceMap.get(agent.id)?.calls || 0,
      })) || [];

      setClientDebts([]); // Not used in this version
      setPaymentTrends(paymentTrends); // Set payment trends for the chart
      setFollowUps(followUpData || []);
      setPtpLogs(ptpData || []);
      setAgentPerformance(agentPerformance);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error fetching data:", error.message);
      } else {
        console.error("Error fetching data:", error);
      }
    } finally {
      setLoading(false);
    }
  }

  // Chart Data for Monthly Payment Trends
  const paymentChartData = {
    labels: paymentTrends.map((p) => new Date(p.uploaded_at).toLocaleDateString()),
    datasets: [
      {
        label: "Total Payments",
        data: paymentTrends.map((p) => p.total),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
      {
        label: "Verified Payments",
        data: paymentTrends.map((p) => p.verified),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  // Download PDF Report
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("Monthly Report", 20, 10);
    autoTable(doc, {
      startY: 20,
      head: [["Account Manager", "Payments Collected", "Follow-Ups", "PTPs", "Calls"]],
      body: agentPerformance.map((agent) => [
        agent.agentName,
        `KES ${agent.payments.toLocaleString()}`,
        agent.followUps,
        agent.ptps,
        agent.calls,
      ]),
    });
    doc.save("Monthly_Report.pdf");
  };

  // Download Excel Report
  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(agentPerformance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, "Monthly_Report.xlsx");
  };

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">📊 Monthly Reports</h2>
        {/* Month Selector */}
        <div className="mb-6">
          <label className="block font-medium">Select Month:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border p-2 rounded-md w-full"
          />
        </div>
        {loading ? (
          <p>Loading reports...</p>
        ) : (
          <>
            {/* Monthly Payment Trend Chart */}
            <div className="bg-white p-6 shadow-md rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">💰 Payment Collection Trend</h3>
              <Bar data={paymentChartData} />
            </div>
            {/* Agent Performance */}
            <div className="bg-white p-6 shadow-md rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">👤 Account Managers Performance</h3>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Account Manager</th>
                    <th className="text-left">Payments Collected</th>
                    <th className="text-left">Follow-Ups</th>
                    <th className="text-left">PTPs</th>
                    <th className="text-left">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.map((agent) => (
                    <tr key={agent.agentId}>
                      <td>{agent.agentName}</td>
                      <td>KES {agent.payments.toLocaleString()}</td>
                      <td>{agent.followUps}</td>
                      <td>{agent.ptps}</td>
                      <td>{agent.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Download Reports */}
            <div className="flex gap-4">
              <button onClick={downloadPDF} className="bg-red-600 text-white px-4 py-2 rounded-md">
                Download PDF
              </button>
              <button onClick={downloadExcel} className="bg-blue-600 text-white px-4 py-2 rounded-md">
                Download Excel
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
