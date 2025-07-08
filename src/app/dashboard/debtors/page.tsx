"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const dealStages = [
  { value: "0", label: "Select" },
  { value: "1", label: "Outsource Email" },
  { value: "13", label: "No Contact Provided" },
  { value: "27", label: "On Hold" },
  { value: "16", label: "Requesting more Information" },
  { value: "22", label: "Invalid Email" },
  { value: "21", label: "Invalid Number" },
  { value: "15", label: "Wrong Number" },
  { value: "2", label: "Introduction Call" },
  { value: "19", label: "Out of Service" },
  { value: "18", label: "Not in Service" },
  { value: "24", label: "Phone Switched Off" },
  { value: "17", label: "Calls Dropped" },
  { value: "25", label: "Follow Up-Email" },
  { value: "3", label: "Ringing No Response" },
  { value: "20", label: "Requested Call Back" },
  { value: "4", label: "Field Visit Meeting" },
  { value: "5", label: "Negotiation in progress" },
  { value: "23", label: "PTP" },
  { value: "7", label: "Scheduled Payment" },
  { value: "8", label: "One-Off Payment" },
  { value: "9", label: "Payment Confirmed by Branch Manager" },
  { value: "10", label: "Debt Settled" },
  { value: "14", label: "Non-Committal" },
  { value: "11", label: "Disputing" },
  { value: "12", label: "Legal" },
  { value: "26", label: "Not Interested - BD" },
  { value: "27", label: "Wrong Number" },
  { value: "28", label: "Phone switched off" },
  { value: "29", label: "No contact provided" },
  { value: "45", label: "Account closed"},
  { value: "46", label: "Buy-off in Progress" },
  { value: "47", label: "Check-off Payment" },
  { value: "48", label: "Pending Booking" },
  { value: "49", label: "Pending" },
];

export default function DebtorsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [filteredDebtors, setFilteredDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDebtors, setSelectedDebtors] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [newAgentId, setNewAgentId] = useState<string>(""); // State for the new agent
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getPaginatedDebtors = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDebtors.slice(startIndex, endIndex);
  };

  // Filter State
  const [filters, setFilters] = useState({
    agent: "",
    state: "",
    client: "",
    overdue: false,
  });

  // Agents State
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch user role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, id, full_name")
        .eq("id", user.id)
        .single();

      if (userError || !userData) {
        console.error("Error fetching user data:", userError?.message || userError);
        router.push("/login");
        return;
      }

      setUserRole(userData.role);
      setUserId(userData.id);

      // Fetch agents
      const { data: agentsData, error: agentsError } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "agent");

      if (agentsError) {
        console.error("Error fetching agents:", agentsError.message);
      } else {
        setAgents(agentsData.map(agent => ({ id: agent.id, name: agent.full_name })));
      }

      // Fetch debtors
      let query = supabase
        .from("debtors")
        .select("*, users:assigned_to(full_name)");

      if (userData.role === "agent") {
        query = query.eq("assigned_to", userData.id);
      } else if (userData.role === "client") {
        query = query.eq("client", userData.full_name); // Filter by client's full name
      }

      const { data: debtorsData, error: debtorsError } = await query;

      if (debtorsError) {
        console.error("Error fetching debtors:", debtorsError.message);
      } else {
        // Fetch payments for each debtor
        const debtorsWithPayments = await Promise.all(
          debtorsData.map(async (debtor) => {
            const { data: paymentsData, error: paymentsError } = await supabase
              .from("payments")
              .select("amount")
              .eq("debtor_id", debtor.id);

            if (paymentsError) {
              console.error("Error fetching payments:", paymentsError.message);
              return {
                ...debtor,
                total_paid: 0,
                balance_due: debtor.debt_amount,
              };
            }

            const total_paid = paymentsData.reduce((sum, p) => sum + p.amount, 0);
            return {
              ...debtor,
              total_paid,
              balance_due: debtor.debt_amount - total_paid,
              deal_stage_label: dealStages.find(stage => stage.value === debtor.deal_stage)?.label || "Unknown",
            };
          })
        );

        setDebtors(debtorsWithPayments);
        setFilteredDebtors(debtorsWithPayments);

        // Extract unique states and clients
        const uniqueStates = [...new Set(debtorsWithPayments.map(debtor => debtor.deal_stage))];
        const uniqueClients = [...new Set(debtorsWithPayments.map(debtor => debtor.client))];

        setStates(uniqueStates);
        setClients(uniqueClients);
      }

      setLoading(false);
    }

    fetchUserData();
  }, [supabase, router]);

  // Search Functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setFilteredDebtors(
      debtors.filter(
        (debtor) =>
          debtor.debtor_name.toLowerCase().includes(query) ||
          debtor.client.toLowerCase().includes(query) ||
          debtor.debtor_phone.includes(query) ||
          (debtor.users?.full_name && debtor.users.full_name.toLowerCase().includes(query))
      )
    );
  };

  // Fetch debtors based on the selected filters
  const fetchDebtors = async () => {
    setLoading(true);
    setMessage(null);

    let query = supabase.from("debtors").select("*, users:assigned_to(full_name)");

    if (filters.agent) {
      query = query.eq("assigned_to", filters.agent);
    }
    if (filters.state) {
      query = query.eq("deal_stage", filters.state);
    }
    if (filters.client) {
      query = query.eq("client", filters.client);
    }
    if (filters.overdue) {
      query = query.lt("next_followup_date", new Date().toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) {
      setMessage({ text: `Error fetching debtors: ${error.message}`, type: "error" });
    } else {
      // Fetch payments for each debtor
      const debtorsWithPayments = await Promise.all(
        data.map(async (debtor) => {
          const { data: paymentsData, error: paymentsError } = await supabase
            .from("payments")
            .select("amount")
            .eq("debtor_id", debtor.id);

          if (paymentsError) {
            console.error("Error fetching payments:", paymentsError.message);
            return {
              ...debtor,
              total_paid: 0,
              balance_due: debtor.debt_amount,
            };
          }

          const total_paid = paymentsData.reduce((sum, p) => sum + p.amount, 0);
          return {
            ...debtor,
            total_paid,
            balance_due: debtor.debt_amount - total_paid,
            deal_stage_label: dealStages.find(stage => stage.value === debtor.deal_stage)?.label || "Unknown",
          };
        })
      );

      setDebtors(debtorsWithPayments);
      setFilteredDebtors(debtorsWithPayments);
    }

    setLoading(false);
  };

  // Log download activity
  const logDownloadActivity = async (action: string, details: string) => {
    const { error } = await supabase
      .from("download_logs")
      .insert([{ user_id: userId, action, details, timestamp: new Date().toISOString() }]);

    if (error) {
      console.error("Error logging download activity:", error.message);
    }
  };

  // Export the fetched debtors as a CSV file
  const exportCsv = () => {
    if (filteredDebtors.length === 0) {
      setMessage({ text: "No debtors to export.", type: "error" });
      return;
    }

    const headers = [
      "Debtor Name",
      "Branch (Manager)",
      "Phone",
      "Total Debt",
      "Total Paid",
      "Remaining Balance",
      "Next Follow-Up",
      ...(userRole === "admin" ? ["Assigned Agent"] : []),
      "Deal Stage",
    ];

    const csvContent = [
      headers.join(","),
      ...filteredDebtors.map(debtor => [
        debtor.debtor_name,
        debtor.client,
        debtor.debtor_phone,
        debtor.debt_amount,
        debtor.total_paid,
        debtor.balance_due,
        debtor.next_followup_date,
        ...(userRole === "admin" ? [debtor.users?.full_name || "Unassigned"] : []),
        debtor.deal_stage_label,
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "debtors.csv";
    a.click();
    URL.revokeObjectURL(url);

    // Log the download activity
    logDownloadActivity("export_csv", `Exported ${filteredDebtors.length} debtors`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Handle row click to view debtor details
  const handleRowClick = (debtorId: string) => {
    router.push(`/dashboard/debtors/${debtorId}`);
  };

  // Handle single debtor delete (Admin-only)
  const handleDeleteDebtor = async (debtorId: string) => {
    if (!confirm("Are you sure you want to delete this debtor?")) return;

    const { error } = await supabase.from("debtors").delete().eq("id", debtorId);

    if (error) {
      setMessage({ text: `Error deleting debtor: ${error.message}`, type: "error" });
    } else {
      setDebtors((prev) => prev.filter((debtor) => debtor.id !== debtorId));
      setFilteredDebtors((prev) => prev.filter((debtor) => debtor.id !== debtorId));
      setMessage({ text: "Debtor deleted successfully!", type: "success" });
    }
  };

  // Handle bulk delete (Admin-only)
  const handleBulkDelete = async () => {
    if (selectedDebtors.length === 0) {
      setMessage({ text: "No debtors selected for deletion.", type: "error" });
      return;
    }

    if (!confirm("Are you sure you want to delete the selected debtors?")) return;

    const { error } = await supabase.from("debtors").delete().in("id", selectedDebtors);

    if (error) {
      setMessage({ text: `Error deleting debtors: ${error.message}`, type: "error" });
    } else {
      setDebtors((prev) => prev.filter((debtor) => !selectedDebtors.includes(debtor.id)));
      setFilteredDebtors((prev) => prev.filter((debtor) => !selectedDebtors.includes(debtor.id)));
      setSelectedDebtors([]); // Reset selection
      setMessage({ text: "Selected debtors deleted successfully!", type: "success" });
    }
  };

  // Handle bulk change of assigned agent (Admin-only)
  const handleBulkChangeAgent = async () => {
    if (selectedDebtors.length === 0) {
      setMessage({ text: "No debtors selected for agent change.", type: "error" });
      return;
    }

    if (!newAgentId) {
      setMessage({ text: "Please select a new Account Manager.", type: "error" });
      return;
    }

    if (!confirm("Are you sure you want to change the assigned Account Manager for the selected debtors?")) return;

    const { error } = await supabase
      .from("debtors")
      .update({ assigned_to: newAgentId })
      .in("id", selectedDebtors);

    if (error) {
      setMessage({ text: `Error changing assigned Account Manager: ${error.message}`, type: "error" });
    } else {
      setDebtors((prev) =>
        prev.map((debtor) =>
          selectedDebtors.includes(debtor.id) ? { ...debtor, assigned_to: newAgentId } : debtor
        )
      );
      setFilteredDebtors((prev) =>
        prev.map((debtor) =>
          selectedDebtors.includes(debtor.id) ? { ...debtor, assigned_to: newAgentId } : debtor
        )
      );
      setSelectedDebtors([]); // Reset selection
      setMessage({ text: "Assigned Account Manager changed successfully! Refresh page to see the changes", type: "success" });
    }
  };

  // Handle checkbox selection for bulk delete
  const handleSelectDebtor = (debtorId: string) => {
    setSelectedDebtors((prev) =>
      prev.includes(debtorId) ? prev.filter((id) => id !== debtorId) : [...prev, debtorId]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-white">
        <div className={`fixed left-0 top-0 h-full transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
         <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
        </div>
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex items-center justify-center`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-700 mb-4"></div>
            <h2 className="text-xl font-semibold text-blue-950">Please wait...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className={`fixed left-0 top-0 h-full transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      </div>
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} p-8`}>
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Debtors</h2>

          {/* Bulk Delete Button (Only for Admins) */}
          {userRole === "admin" && selectedDebtors.length > 0 && (
            <div className="flex space-x-4">
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Delete Selected
              </button>
              <select
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="">Select New Account Manager</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkChangeAgent}
                className="bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Change Account Manager
              </button>
            </div>
          )}

          {/* Export to CSV Button (For Clients and Admins) */}
          {(userRole === "admin" || userRole === "client") && (
            <button
              onClick={exportCsv}
              className="bg-green-600 text-white px-4 py-2 rounded-md"
            >
              Export as CSV
            </button>
          )}
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-3 mb-4 rounded-md text-white ${
              message.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search debtors..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Section */}
        {userRole !== "client" && (
          <div className="mb-4 p-4 bg-white shadow-md rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Filter Debtors</h3>
            <div className="grid grid-cols-2 gap-4">
              {userRole === 'admin' && (
                <select
                  value={filters.agent}
                  onChange={(e) => setFilters({ ...filters, agent: e.target.value })}
                  className="p-2 border rounded-md w-full"
                >
                  <option value="">All Account Managers</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                className="p-2 border rounded-md w-full"
              >
                <option value="">All States</option>
                {dealStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.client}
                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                className="p-2 border rounded-md w-full"
              >
                <option value="">All Branches</option>
                {clients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.overdue}
                  onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })}
                  className="mr-2"
                />
                Overdue
              </label>
            </div>
            <button
              onClick={fetchDebtors}
              disabled={loading}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              {loading ? "Fetching..." : "Fetch Debtors"}
            </button>
          </div>
        )}

        {/* Debtors Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-blue-900 text-white">
                {userRole === "admin" && <th className="px-4 py-2 border">Select</th>}
                <th className="px-4 py-2 border">Debtor Name</th>
                <th className="px-4 py-2 border">Branch (Manager)</th>
                <th className="px-4 py-2 border">Phone</th>
                <th className="px-4 py-2 border">Total Debt</th>
                <th className="px-4 py-2 border">Total Paid</th>
                <th className="px-4 py-2 border">Remaining Balance</th>
                <th className="px-4 py-2 border">Next Follow-Up</th>
                <th className="px-4 py-2 border">Account Manager</th>
                <th className="px-4 py-2 border">Deal Stage</th>
                {userRole === "admin" && <th className="px-4 py-2 border">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {getPaginatedDebtors().map((debtor) => (
                <tr
                  key={debtor.id}
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleRowClick(debtor.id)}
                >
                  {userRole === "admin" && (
                    <td className="px-4 py-2 border text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        onChange={() => handleSelectDebtor(debtor.id)}
                      />
                    </td>
                  )}
                  <td className="px-4 py-2 border">{debtor.debtor_name}</td>
                  <td className="px-4 py-2 border">{debtor.client}</td>
                  <td className="px-4 py-2 border">{debtor.debtor_phone}</td>
                  <td className="px-4 py-2 border">KES {debtor.debt_amount.toLocaleString()}</td>
                  <td className="px-4 py-2 border">KES {debtor.total_paid.toLocaleString()}</td>
                  <td className="px-4 py-2 border">KES {debtor.balance_due.toLocaleString()}</td>
                  <td className="px-4 py-2 border">{debtor.next_followup_date}</td>
                  
                    <td className="px-4 py-2 border">{debtor.users?.full_name || "Unassigned"}</td>
                  
                  <td className="px-4 py-2 border">{debtor.deal_stage_label}</td>
                  {userRole === "admin" && (
                    <td className="px-4 py-2 border text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeleteDebtor(debtor.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded-md"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
              Page {currentPage} of {Math.ceil(filteredDebtors.length / itemsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(
                Math.ceil(filteredDebtors.length / itemsPerPage),
                prev + 1
              ))}
              disabled={currentPage === Math.ceil(filteredDebtors.length / itemsPerPage)}
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
      </main>
    </div>
  );
}
