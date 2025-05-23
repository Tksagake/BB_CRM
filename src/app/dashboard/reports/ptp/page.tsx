"use client";

import { SetStateAction, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import dayjs from "dayjs";
import Spinner from "@/components/Spinner";
import PtpModal from "@/components/PtPModal";

const supabase = createClientComponentClient();

export default function PtpPage() {
  const router = useRouter();
  const [ptps, setPtps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [clients, setClients] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [userRole, setUserRole] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userId, setUserId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPtp, setSelectedPtp] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  // Fetch user details
  useEffect(() => {
    async function fetchUserData() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error("User not authenticated:", error?.message);
        setLoading(false);
        return;
      }

      const { data, error: userError } = await supabase
        .from("users")
        .select("role, full_name, id")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching user details:", userError.message);
      } else {
        setUserId(user.id);
        setUserRole(data.role);
        setUserFullName(data.full_name);
      }
    }

    fetchUserData();
  }, []);

  // Fetch clients for filter
  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase.from("debtors").select("client");

      if (error) {
        console.error("Error fetching clients:", error.message);
      } else {
        const uniqueClients = [...new Set(data.map((item) => item.client))];
        setClients(uniqueClients);
      }
    }

    fetchClients();
  }, []);

  // Fetch ptps based on role & filters
  useEffect(() => {
    async function fetchPtps() {
      if (!userRole) return;
      setLoading(true);

      let query = supabase
        .from("ptp")
        .select(`
          id,
          ptp_date,
          ptp_amount,
          total_debt,
          created_at,
          amount_paid,
          status,
          debtors:debtor_id (id, debtor_name, client),
          agents:agent_id (id, full_name)
        `)
        .order("ptp_date", { ascending: false });

      // Apply role-based filtering
      if (userRole === "agent") {
        query = query.eq("agent_id", userId);
      } else if (userRole === "client") {
        query = query.eq("debtors.client", userFullName);
      }

      // Apply date filters
      if (dateFilter === "weekly") {
        const oneWeekAgo = dayjs().subtract(1, "week").toISOString();
        query = query.gte("ptp_date", oneWeekAgo);
      } else if (dateFilter === "monthly") {
        const oneMonthAgo = dayjs().subtract(1, "month").toISOString();
        query = query.gte("ptp_date", oneMonthAgo);
      } else if (dateFilter.startsWith("month-")) {
        const month = parseInt(dateFilter.split("-")[1], 10);
        const startOfMonth = dayjs().month(month - 1).startOf("month").toISOString();
        const endOfMonth = dayjs().month(month - 1).endOf("month").toISOString();
        query = query.gte("ptp_date", startOfMonth).lte("ptp_date", endOfMonth);
      }

      const { data: ptpData, error: ptpError } = await query;
      if (ptpError) {
        console.error("Error fetching ptps:", ptpError.message);
        setLoading(false);
        return;
      }

      // Filter ptps based on client filter
      const filteredPtps = ptpData.filter((ptp) => {
        if (clientFilter === "all") return true;
        return Array.isArray(ptp.debtors)
          ? ptp.debtors.some(debtor => debtor.client?.toLowerCase() === clientFilter.toLowerCase())
          : (ptp.debtors && (ptp.debtors as { client?: string }).client?.toLowerCase() === clientFilter.toLowerCase());
      });

      setPtps(filteredPtps);
      setLoading(false);
    }

    fetchPtps();
  }, [userRole, userFullName, userId, dateFilter, clientFilter]);

  // Get paginated ptps
  const getPaginatedPtps = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return ptps.filter(ptp =>
      ptp.debtors?.debtor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ptp.debtors?.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ptp.agents?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(startIndex, endIndex);
  };

  // Function to download ptps as CSV
  const downloadCsv = () => {
    const headers = ["Debtor Name", "Client", "PTP Amount", "Total Debt", "PTP Date", "Agent", "Status", "Amount Paid"];
    const rows = ptps.map((ptp) => [
      `"${ptp.debtors?.debtor_name || "Unknown"}"`,
      `"${ptp.debtors?.client || "Unknown"}"`,
      `"KES ${ptp.ptp_amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}"`,
      `"KES ${ptp.total_debt.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}"`,
      `"${new Date(ptp.ptp_date).toLocaleDateString()}"`,
      `"${ptp.agents?.full_name || "Unknown"}"`,
      `"${ptp.status}"`,
      `"KES ${ptp.amount_paid.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ptps.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusClass = (status: any) => {
    switch (status) {
      case 'fully_honored':
        return 'bg-green-200';
      case 'partially_honored':
        return 'bg-yellow-200';
      case 'pending':
        return 'bg-red-200';
      default:
        return '';
    }
  };

  const updatePtpStatus = async (id: any, newStatus: any, amountPaid: any) => {
    const { error } = await supabase
      .from('ptp')
      .update({ status: newStatus, amount_paid: amountPaid })
      .eq('id', id);

    if (error) {
      console.error("Error updating PTP status:", error.message);
    } else {
      setPtps(ptps.map(ptp => ptp.id === id ? { ...ptp, status: newStatus, amount_paid: amountPaid } : ptp));
    }
  };

  const handleOpenModal = (ptp: SetStateAction<null>) => {
    setSelectedPtp(ptp);
  };

  const handleCloseModal = () => {
    setSelectedPtp(null);
  };

  // Function to delete a PTP
  const deletePtp = async (ptpId: any) => {
    if (window.confirm("Are you sure you want to delete this PTP?")) {
      const { error } = await supabase.from("ptp").delete().eq("id", ptpId);
      if (error) {
        console.error("Error deleting PTP:", error.message);
      } else {
        setPtps(ptps.filter((ptp) => ptp.id !== ptpId));
      }
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Promise to Pay (PTP)</h2>
        <h2 title="Total PTP Amount" className="text-2xl font-semibold text-green-600 mb-4">
          {`KES ${ptps.reduce((total, ptp) => total + ptp.ptp_amount, 0).toLocaleString()}`}
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Date Filter */}
          <div>
            <label className="block mb-1">Filter by date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">All</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={`month-${i + 1}`}>
                  {dayjs().month(i).format("MMMM")}
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          {userRole !== "client" && (
            <div>
              <label className="block mb-1">Filter by client:</label>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="all">All</option>
                {clients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Bar */}
          <div>
            <label className="block mb-1">Search:</label>
            <input
              type="text"
              placeholder="Search PTPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* CSV Download Button */}
          {userRole !== "agent" && (
            <button
              onClick={downloadCsv}
              className="bg-green-600 text-white px-4 py-2 rounded-md self-end"
            >
              Download as CSV
            </button>
          )}
        </div>

        {/* PtP Table */}
        {loading ? (
          <p className="text-center text-lg">Loading PTPs...</p>
        ) : ptps.length === 0 ? (
          <p className="text-center text-lg text-gray-500">No PTPs found.</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
            <table className="w-full border-collapse border border-gray-200">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-4 py-2 border">Debtor Name</th>
                  <th className="px-4 py-2 border">Client</th>
                  <th className="px-4 py-2 border">PTP Amount</th>
                  <th className="px-4 py-2 border">Total Debt</th>
                  <th className="px-4 py-2 border">PTP Date</th>
                  {userRole !== "client" && <th className="px-4 py-2 border">Agent</th>}
                  <th className="px-4 py-2 border">Status</th>
                  <th className="px-4 py-2 border">Amount Paid</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {getPaginatedPtps().map((ptp) => (
                  <tr key={ptp.id} className={`hover:bg-gray-100 ${getStatusClass(ptp.status)}`}>
                    <td className="px-4 py-2 border">{ptp.debtors?.debtor_name || "Unknown"}</td>
                    <td className="px-4 py-2 border">{ptp.debtors?.client || "Unknown"}</td>
                    <td className="px-4 py-2 border">KES {ptp.ptp_amount.toLocaleString()}</td>
                    <td className="px-4 py-2 border">KES {ptp.total_debt.toLocaleString()}</td>
                    <td className="px-4 py-2 border">{new Date(ptp.ptp_date).toLocaleDateString()}</td>
                    {userRole !== "client" && (
                      <td className="px-4 py-2 border">{ptp.agents?.full_name || "Unknown"}</td>
                    )}
                    <td className="px-4 py-2 border">{ptp.status}</td>
                    <td className="px-4 py-2 border">KES {ptp.amount_paid.toLocaleString()}</td>
                    <td className="px-4 py-2 border">
                      <button onClick={() => handleOpenModal(ptp)} className="text-blue-600">Edit</button>
                      {userRole === "admin" && (
                        <button
                          onClick={() => deletePtp(ptp.id)}
                          className="text-red-600 ml-2"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(ptps.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(
                    Math.ceil(ptps.length / itemsPerPage),
                    prev + 1
                  ))}
                  disabled={currentPage === Math.ceil(ptps.length / itemsPerPage)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border rounded-md"
              >
                <option value="5">5 per page</option>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        )}

        {selectedPtp && (
          <PtpModal
            ptp={selectedPtp}
            onSave={updatePtpStatus}
            onClose={handleCloseModal}
          />
        )}
      </main>
    </div>
  );
}
