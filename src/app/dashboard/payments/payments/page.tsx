"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import dayjs from "dayjs";
import DashboardCard from "@/components/DashboardCard";

const supabase = createClientComponentClient();

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [clients, setClients] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // New state for status filter
  const [userRole, setUserRole] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userId, setUserId] = useState("");
  const [totalAmountRecovered, setTotalAmountRecovered] = useState(0);
  const [mtdPayments, setMtdPayments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearchQuery =
      payment.debtors?.debtor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.debtors?.client?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatusFilter =
      statusFilter === "all" ||
      (statusFilter === "verified" && payment.verified) ||
      (statusFilter === "pending" && !payment.verified);

    const matchesClientFilter =
      clientFilter === "all" || payment.debtors?.client === clientFilter;

    return matchesSearchQuery && matchesStatusFilter && matchesClientFilter;
  });

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to the first page when items per page changes
  };

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

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

  // Fetch payments based on role & filters
  useEffect(() => {
    async function fetchPayments() {
      if (!userRole) return;
      setLoading(true);

      let query = supabase
        .from("payments")
        .select(`
          id,
          amount,
          pop_url,
          verified,
          payment_date,
          uploaded_at,
          debtors!inner(
            debtor_name,
            client,
            assigned_to,
            users!debtors_assigned_to_fkey(full_name)
          ),
          invoiced
        `)
        .order("payment_date", { ascending: false });

      // Apply role-based filtering
      if (userRole === "agent") {
        query = query.eq("debtors.assigned_to", userId);
      } else if (userRole === "client") {
        query = query.eq("debtors.client", userFullName);
      }

      // Apply date filters
      if (dateFilter === "weekly") {
        const oneWeekAgo = dayjs().subtract(1, "week").toISOString();
        query = query.gte("payment_date", oneWeekAgo);
      } else if (dateFilter === "monthly") {
        const oneMonthAgo = dayjs().subtract(1, "month").toISOString();
        query = query.gte("payment_date", oneMonthAgo);
      } else if (dateFilter.startsWith("month-")) {
        const month = parseInt(dateFilter.split("-")[1], 10);
        const startOfMonth = dayjs().month(month - 1).startOf("month").toISOString();
        const endOfMonth = dayjs().month(month - 1).endOf("month").toISOString();
        query = query.gte("payment_date", startOfMonth).lte("payment_date", endOfMonth);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching payments:", error.message);
      } else {
        setPayments(data);
        setTotalAmountRecovered(data.reduce((total, payment) => total + payment.amount, 0));

        // Calculate MTD Payments
        const startOfMonth = dayjs().startOf("month").toISOString();
        const endOfMonth = dayjs().endOf("month").toISOString();
        const mtdPayments = data.filter(
          (payment) => payment.uploaded_at >= startOfMonth && payment.uploaded_at <= endOfMonth
        ).reduce((total, payment) => total + payment.amount, 0);
        setMtdPayments(mtdPayments);
      }

      setLoading(false);
    }

    fetchPayments();
  }, [userRole, userFullName, userId, dateFilter, clientFilter, statusFilter]);

  // Function to download approved payments as CSV
  const downloadCsv = () => {
    const headers = ["Debtor Name", "Branch", "Collection Officer", "Amount", "Payment Date", "Date Posted"];
    const rows = payments
      .filter((payment) => payment.verified)
      .map((payment) => [
        `"${payment.debtors?.debtor_name || "Unknown"}"`,
        `"${payment.debtors?.client || "Unknown"}"`,
        `"${payment.debtors?.users?.full_name || "Unassigned"}"`, // New field
        `"${payment.amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}"`,
        `"${new Date(payment.payment_date).toLocaleDateString()}"`,
        `"${new Date(payment.uploaded_at).toLocaleDateString()}"`,
      ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "approved_payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Function to download all payments as CSV
  const downloadAllPaymentsCsv = () => {
    const headers = ["Debtor Name", "Client", "Collection Officer", "Amount", "Payment Date", "Date Posted", "Status"];
    const rows = payments.map((payment) => [
      `"${payment.debtors?.debtor_name || "Unknown"}"`,
      `"${payment.debtors?.client || "Unknown"}"`,
      `"${payment.debtors?.users?.full_name || "Unassigned"}"`, // New field
      `"${payment.amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}"`,
      `"${new Date(payment.payment_date).toLocaleDateString()}"`,
      `"${new Date(payment.uploaded_at).toLocaleDateString()}"`,
      `"${payment.verified ? "Verified" : "Pending"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all_payments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Function to toggle invoiced status
  const toggleInvoiced = async (paymentId: any, currentStatus: any) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from("payments")
      .update({ invoiced: newStatus })
      .eq("id", paymentId);

    if (error) {
      console.error("Error updating invoiced status:", error.message);
    } else {
      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment.id === paymentId ? { ...payment, invoiced: newStatus } : payment
        )
      );
    }
  };

  // Function to delete a payment
  const deletePayment = async (paymentId: any) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      const { error } = await supabase.from("payments").delete().eq("id", paymentId);
      if (error) {
        console.error("Error deleting payment:", error.message);
      } else {
        setPayments(payments.filter((payment) => payment.id !== paymentId));
      }
    }
  };

  // Function to open edit modal
  const openEditModal = (payment: any) => {
    setSelectedPayment(payment);
    setEditModalOpen(true);
  };

  // Function to close edit modal
  const closeEditModal = () => {
    setSelectedPayment(null);
    setEditModalOpen(false);
  };

  // Function to save edited payment
  const saveEditedPayment = async () => {
    if (selectedPayment) {
      const { error } = await supabase
        .from("payments")
        .update({
          amount: selectedPayment.amount,
          verified: selectedPayment.verified,
          payment_date: selectedPayment.payment_date,
        })
        .eq("id", selectedPayment.id);

      if (error) {
        console.error("Error updating payment:", error.message);
      } else {
        setPayments(
          payments.map((payment) =>
            payment.id === selectedPayment.id ? selectedPayment : payment
          )
        );
        closeEditModal();
      }
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Payment Tracking</h2>
        <h2 title="Amount Recovered" className="text-2xl font-semibold text-green-600 mb-4">
          {`All Collections KES ${totalAmountRecovered.toLocaleString()}`}
        </h2>
        <h2 title="MTD Payments" className="text-2xl font-semibold text-blue-600 mb-4">
          {`MTD Payments KES ${mtdPayments.toLocaleString()}`}
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
              <label className="block mb-1">Filter by Branch:</label>
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

          {/* Status Filter */}
          <div>
            <label className="block mb-1">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Items Per Page Filter */}
          <div>
            <label className="block mb-1">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="p-2 border rounded-md"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block mb-1">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchQueryChange}
              className="p-2 border rounded-md"
              placeholder="Search by debtor or client"
            />
          </div>

          {/* CSV Download Buttons */}
          {userRole !== "agent" && (
            <>
              <button
                onClick={downloadCsv}
                className="bg-green-600 text-white px-4 py-2 rounded-md self-end"
              >
                Download Approved CSV
              </button>
              <button
                onClick={downloadAllPaymentsCsv}
                className="bg-blue-600 text-white px-4 py-2 rounded-md self-end ml-2"
              >
                Download All Payments CSV
              </button>
            </>
          )}
        </div>

        {/* Payments Table */}
        {loading ? (
          <p className="text-center text-lg">Loading payments...</p>
        ) : filteredPayments.length === 0 ? (
          <p className="text-center text-lg text-gray-500">No payments found.</p>
        ) : (
          <>
            <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="p-4 text-left">Debtor Name</th>
                  <th className="p-4 text-left">Branch</th>
                  <th className="p-4 text-left">Collection Officer</th> {/* New column */}
                  <th className="p-4 text-left">Amount</th>
                  <th className="p-4 text-left">Payment Date</th>
                  <th className="p-4 text-left">Date Posted</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Invoiced</th>
                  <th className="p-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPayments.map((payment) => (
                  <tr key={payment.id} className="border-b hover:bg-gray-100 cursor-pointer">
                    <td className="p-4">{payment.debtors?.debtor_name || "Unknown"}</td>
                    <td className="p-4">{payment.debtors?.client || "Unknown"}</td>
                    <td className="p-4">{payment.debtors?.users?.full_name || "Unassigned"}</td> {/* New column */}
                    <td className="p-4">{payment.amount.toLocaleString()}</td>
                    <td className="p-4">{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td className="p-4">{new Date(payment.uploaded_at).toLocaleDateString()}</td>
                    <td className="p-4">{payment.verified ? "✅ Verified" : "⏳ Pending"}</td>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={payment.invoiced}
                        onChange={() => toggleInvoiced(payment.id, payment.invoiced)}
                      />
                    </td>
                    <td className="px-4 py-2 border">
                      <button
                        onClick={() => router.push(`/dashboard/payments/${payment.id}`)}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md"
                      >
                        View
                      </button>
                      {userRole === "admin" && (
                        <>
                          <button
                            onClick={() => openEditModal(payment)}
                            className="bg-yellow-600 text-white px-3 py-1 rounded-md ml-1"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deletePayment(payment.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-md ml-1"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>
      {/* Edit Modal */}
      {editModalOpen && selectedPayment && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Payment</h2>
            <div className="mb-4">
              <label className="block mb-1">Amount</label>
              <input
                type="number"
                value={selectedPayment.amount}
                onChange={(e) => setSelectedPayment({ ...selectedPayment, amount: Number(e.target.value) })}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Payment Date</label>
              <input
                type="date"
                value={selectedPayment.payment_date.split("T")[0]}
                onChange={(e) => setSelectedPayment({ ...selectedPayment, payment_date: e.target.value })}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Verified</label>
              <select
                value={selectedPayment.verified ? "true" : "false"}
                onChange={(e) => setSelectedPayment({ ...selectedPayment, verified: e.target.value === "true" })}
                className="w-full p-2 border rounded-md"
              >
                <option value="true">Verified</option>
                <option value="false">Pending</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button onClick={closeEditModal} className="px-4 py-2 bg-gray-600 text-white rounded-md mr-2">
                Cancel
              </button>
              <button onClick={saveEditedPayment} className="px-4 py-2 bg-blue-600 text-white rounded-md">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}