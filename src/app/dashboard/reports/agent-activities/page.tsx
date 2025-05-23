"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from 'next/navigation';
import { supabase } from "../../../../../lib/supabaseClient";
import Spinner from "@/components/Spinner";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Construction, AlertTriangle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AgentActivities() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [eventLogs, setEventLogs] = useState<any[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const router = useRouter();

  // Fetch initial data + setup real-time updates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch call logs
        const { data: callData, error: callError } = await supabase
          .from('call_logs')
          .select('*')
          .order('start_time', { ascending: false });

        if (callError) throw callError;

        // Fetch event logs
        const { data: eventData, error: eventError } = await supabase
          .from('event_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        if (eventError) throw eventError;

        setCallLogs(callData || []);
        setEventLogs(eventData || []);

        // Fetch agents
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('role', 'agent');

        if (userError) throw userError;

        setAgents(userData.map((user: any) => user.full_name));
      } catch (err) {
        setError("Failed to load data");
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter logs by selected agent
  const filteredCallLogs = callLogs.filter(log => log.agent_name === selectedAgent);
  const filteredEventLogs = eventLogs.filter(log => log.user_role === 'agent' && log.user_id === selectedAgent);

  // Calculate analytics
  const calculateCallAnalytics = () => {
    const analytics: Record<string, { total: number; successful: number }> = {};

    filteredCallLogs.forEach((call) => {
      const date = new Date(call.start_time).toLocaleDateString();

      if (!analytics[date]) analytics[date] = { total: 0, successful: 0 };

      analytics[date].total += 1;
      if (call.status === 'ANSWER') analytics[date].successful += 1;
    });

    return analytics;
  };

  const calculateEventAnalytics = () => {
    const analytics: Record<string, { total: number }> = {};

    filteredEventLogs.forEach((event) => {
      const date = new Date(event.timestamp).toLocaleDateString();

      if (!analytics[date]) analytics[date] = { total: 0 };

      analytics[date].total += 1;
    });

    return analytics;
  };

  const callAnalytics = calculateCallAnalytics();
  const eventAnalytics = calculateEventAnalytics();

  // Chart data
  const callChartData = {
    labels: Object.keys(callAnalytics),
    datasets: [
      {
        label: 'Total Calls',
        data: Object.values(callAnalytics).map(stats => stats.total),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Successful Calls',
        data: Object.values(callAnalytics).map(stats => stats.successful),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  const eventChartData = {
    labels: Object.keys(eventAnalytics),
    datasets: [
      {
        label: 'Total Events',
        data: Object.values(eventAnalytics).map(stats => stats.total),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  };

  // if (loading) return <Spinner />;

  return (
    <div className="flex min-h-screen w-full justify-center items-center flex-col">
      <Navbar handleLogout={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }} />
      <Construction size={48} className="mb-4" />
      <AlertTriangle size={48} className="mb-4" />
      <h1 className="text-4xl font-bold text-center text-red-700">THIS PAGE IS UNDER CONSTRUCTION</h1>
      <p className="text-lg mt-4 text-blue-600">Please check again later</p>

      {/* <div className="flex min-h-screen w-full">
        <Navbar handleLogout={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }} />

        <main className="ml-64 flex-1 p-8">
          <h1 className="text-xl font-bold mb-4">📊 Agent Activities</h1>

          {/* Status Indicators */}
          {/* {loading && <p className="text-blue-500">Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}

          {/* Filters */}
          {/* <div className="mb-4 flex gap-2">
            <select
              className="border p-2 rounded"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="">Select Agent</option>
              {agents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
            <select
              className="border p-2 rounded"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Select Month</option>
              {/* Add options for months here */}
            {/* </select>
            <Calendar
              onChange={(date) => setSelectedDate(date)}
              value={selectedDate}
              className="mb-4"
            />
          </div>

          {/* Call Logs Table */}
          {/* <div className="overflow-x-auto mb-8">
            <h2 className="text-lg font-bold mb-2">Call Logs</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Debtor</th>
                  <th className="border p-2 text-left">Direction</th>
                  <th className="border p-2 text-left">When</th>
                  <th className="border p-2 text-left">Duration</th>
                  <th className="border p-2 text-left">Status</th>
                  <th className="border p-2 text-left">Recording</th>
                </tr>
              </thead>
              <tbody>
                {filteredCallLogs.length > 0 ? (
                  filteredCallLogs.map((call) => (
                    <tr key={call.call_sid} className="hover:bg-gray-50">
                      <td className="border p-2">
                        {call.agent_number || "Unknown"}
                        {call.agent_name && <div className="text-xs text-gray-500">{call.agent_name}</div>}
                      </td>
                      <td className="border p-2">
                        {call.direction === 'outbound' ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Outbound</span>
                        ) : (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Inbound</span>
                        )}
                      </td>
                      <td className="border p-2">{new Date(call.start_time).toLocaleString()}</td>
                      <td className="border p-2">{call.call_duration || "N/A"}s</td>
                      <td className="border p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          call.status === 'completed' ? 'bg-green-100 text-green-800' :
                          call.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {call.status || "unknown"}
                        </span>
                      </td>
                      <td className="border p-2">
                        {call.call_recording_url ? (
                          <a
                            href={call.call_recording_url}
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            Listen
                          </a>
                        ) : (
                          "None"
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="border p-2 text-center">
                      No call logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Event Logs Table */}
          {/* <div className="overflow-x-auto mb-8">
            <h2 className="text-lg font-bold mb-2">Event Logs</h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Action</th>
                  <th className="border p-2 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventLogs.length > 0 ? (
                  filteredEventLogs.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="border p-2">{event.action}</td>
                      <td className="border p-2">{new Date(event.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="border p-2 text-center">
                      No event logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Call Analytics Chart */}
          {/* <div className="mb-8">
            <h2 className="text-lg font-bold mb-2">Call Analytics</h2>
            <Bar data={callChartData} />
          </div>

          {/* Event Analytics Chart */}
          {/* <div className="mb-8">
            <h2 className="text-lg font-bold mb-2">Event Analytics</h2>
            <Bar data={eventChartData} />
          </div>

        </main>

      </div> */}
    </div>
  );
}
