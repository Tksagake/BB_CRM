"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useRouter } from 'next/navigation';
import { supabase } from "../../../../../lib/supabaseClient";
import Spinner from "@/components/Spinner";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function LiveCalls() {
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [agents, setAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const router = useRouter();

  // Add client-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Pagination controls
  const PaginationControls = () => (
    <div className="flex justify-center mt-4">
      <button
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
      >
        Previous
      </button>
      <span className="px-4 py-2">Page {currentPage} of {totalPages}</span>
      <button
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );

  // 1. Fetch initial data + setup real-time updates
  useEffect(() => {
    const fetchCallLogs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('call_logs')
          .select('*')
          .order('start_time', { ascending: false });

        if (error) throw error;

        setCallLogs(data || []);
        applyFilters(data || []);
        setAgents(Array.from(new Set(data.map(call => call.agent_name))));
      } catch (err) {
        setError("Failed to load call logs");
        console.error("❌ Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCallLogs();

    // 2. Real-time subscription
    const channel = supabase
      .channel('call-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs'
        },
        (payload) => {
          console.log("🔔 New update:", payload);
          setCallLogs(prev => [payload.new, ...prev]);
          setAgents(prev => Array.from(new Set([...prev, (payload.new as { agent_name: string }).agent_name])));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3. Apply filters
  const applyFilters = (logs: any[]) => {
    let filtered = [...logs];

    if (dateFilter) {
      filtered = filtered.filter(call =>
        call.start_time?.startsWith(dateFilter)
      );
    }

    if (timeFilter) {
      filtered = filtered.filter(call =>
        call.start_time?.includes(`T${timeFilter}`)
      );
    }

    if (agentFilter) {
      filtered = filtered.filter(call =>
        call.agent_name?.toLowerCase().includes(agentFilter.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  // 4. Re-apply filters when filters/logs change
  useEffect(() => {
    applyFilters(callLogs);
  }, [dateFilter, timeFilter, agentFilter, callLogs]);

  // 5. Format time display
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  // Add analytics section
  const calculateAnalytics = () => {
    const analytics: Record<string, Record<string, { total: number; successful: number }>> = {};

    filteredLogs.forEach((call) => {
      const date = new Date(call.start_time).toLocaleDateString();
      const agent = call.agent_name || "Unknown";

      if (!analytics[date]) analytics[date] = {};
      if (!analytics[date][agent]) analytics[date][agent] = { total: 0, successful: 0 };

      analytics[date][agent].total += 1;
      if (call.status === 'ANSWER') analytics[date][agent].successful += 1;
    });

    return analytics;
  };

  const calculateMonthlyAnalytics = () => {
    const monthlyAnalytics: Record<string, Record<string, { total: number; successful: number }>> = {};

    filteredLogs.forEach((call) => {
      const month = new Date(call.start_time).toLocaleString('default', { month: 'long', year: 'numeric' });
      const agent = call.agent_name || "Unknown";

      if (!monthlyAnalytics[month]) monthlyAnalytics[month] = {};
      if (!monthlyAnalytics[month][agent]) monthlyAnalytics[month][agent] = { total: 0, successful: 0 };

      monthlyAnalytics[month][agent].total += 1;
      if (call.status === 'ANSWER') monthlyAnalytics[month][agent].successful += 1;
    });

    return monthlyAnalytics;
  };

  const analytics = calculateAnalytics();
  const monthlyAnalytics = calculateMonthlyAnalytics();

  if (loading) return <Spinner />;
  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => {
        await supabase.auth.signOut();
        router.push("/login");
      }} />

      <main className="ml-64 flex-1 p-8">
        <h1 className="text-xl font-bold mb-4">📞 Live Call Logs</h1>

        {/* Status Indicators */}
        {loading && <p className="text-blue-500">Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* Filters */}
        <div className="mb-4 flex gap-2">
          <input
            type="date"
            className="border p-2 rounded"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <input
            type="time"
            className="border p-2 rounded"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="">All Agents</option>
            {agents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setDateFilter("");
              setTimeFilter("");
              setAgentFilter("");
            }}
            className="bg-gray-200 px-4 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>

        {/* Call Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Debtor</th>
                <th className="border p-2 text-left">Agent Calling</th>
                <th className="border p-2 text-left">Direction</th>
                <th className="border p-2 text-left">When</th>
                <th className="border p-2 text-left">Duration</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Recording</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((call) => (
                  <tr key={call.call_sid} className="hover:bg-gray-50">
                    <td className="border p-2">
                      {call.agent_number || "Unknown"}
                      {call.agent_name && <div className="text-xs text-gray-500">{call.agent_name}</div>}
                    </td>
                    <td className="border p-2">
                      {call.receiver_number || "Unknown"}
                      {call.receiver_name && <div className="text-xs text-gray-500">{call.receiver_name}</div>}
                    </td>
                    <td className="border p-2">
                      {call.direction === 'outbound' ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Outbound</span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Inbound</span>
                      )}
                    </td>
                    <td className="border p-2">{formatTime(call.start_time)}</td>
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
                  <td colSpan={7} className="border p-2 text-center">
                    {loading ? "Loading..." : "No call logs found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls />

        {/* Monthly Analytics Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4">📊 Monthly Call Analytics</h2>
          {Object.keys(monthlyAnalytics).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(monthlyAnalytics).map(([month, agents]) => (
                <div key={month} className="border p-4 rounded">
                  <h3 className="text-md font-semibold">{month}</h3>
                  <div className="mt-2 space-y-2">
                    {Object.entries(agents).map(([agent, stats]) => (
                      <div key={agent} className="flex justify-between items-center border-b pb-2">
                        <span>{agent}</span>
                        <span>Number of calls: {stats.total}</span>
                        <span>Success Rate: {((stats.successful / stats.total) * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No monthly analytics data available.</p>
          )}
        </div>

        {/* Daily Analytics Section */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4">📊 Daily Call Analytics</h2>
          <Calendar
            onChange={(date) => setSelectedDate(Array.isArray(date) ? date[0] : date)}
            value={selectedDate}
            className="mb-4"
          />
          {selectedDate && analytics[selectedDate.toLocaleDateString()] ? (
            <div className="space-y-2">
              {Object.entries(analytics[selectedDate.toLocaleDateString()]).map(([agent, stats]) => (
                <div key={agent} className="flex justify-between items-center border-b pb-2">
                  <span>{agent}</span>
                  <span>Number of calls: {stats.total}</span>
                  <span>Success Rate: {((stats.successful / stats.total) * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Select a date to view daily analytics.</p>
          )}
        </div>
      </main>
    </div>
  );
}
