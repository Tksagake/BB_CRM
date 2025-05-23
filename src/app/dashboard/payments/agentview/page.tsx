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
  const [userRole, setUserRole] = useState("");
  const [userFullName, setUserFullName] = useState("");
  const [userId, setUserId] = useState("");
  const [totalAmountRecovered, setTotalAmountRecovered] = useState(0);
  const [mtdPayments, setMtdPayments] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
        console.error("Error fetching branch details:", error.message);
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
        .select("id, amount, pop_url, verified, payment_date,uploaded_at, debtors!inner(debtor_name, client, assigned_to)")
        .order("payment_date", { ascending: false });

      // Apply role-based filteringuploaded_at
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
        const filteredPayments =
          clientFilter === "all"
            ? data
            : data.filter((payment) => payment.debtors[0]?.client === clientFilter);
        setPayments(filteredPayments);
        setTotalAmountRecovered(filteredPayments.reduce((total, payment) => total + payment.amount, 0));

        // Calculate MTD Payments
        const startOfMonth = dayjs().startOf("month").toISOString();
        const endOfMonth = dayjs().endOf("month").toISOString();
        const mtdPayments = filteredPayments.filter(
          (payment) => payment.uploaded_at >= startOfMonth && payment.uploaded_at <= endOfMonth
        ).reduce((total, payment) => total + payment.amount, 0);
        setMtdPayments(mtdPayments);
      }

      setLoading(false);
    }

    fetchPayments();
  }, [userRole, userFullName, userId, dateFilter, clientFilter]);

  // Function to download payments as CSV
  const downloadCsv = () => {
    const headers = ["Debtor Name", "Branch", "Amount", "Payment Date"];
    const rows = payments
      .filter((payment) => payment.verified)
      .map((payment) => [
        `"${payment.debtors?.debtor_name || "Unknown"}"`,
        `"${payment.debtors?.client || "Unknown"}"`,
        `"KES ${payment.amount.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}"`,
        `"${new Date(payment.payment_date).toLocaleDateString()}"`,
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

  const paginatedPayments = payments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Payment Tracking</h2>
        <h2 title="Amount Recovered" className="text-2xl font-semibold text-green-600 mb-4">
          {`KES ${totalAmountRecovered.toLocaleString()}`}
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
          {/* {userRole !== "client" && (
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
          )}  */}

          {/* CSV Download Button */}
            {/* <button
            onClick={downloadCsv}
            className="bg-green-600 text-white px-4 py-2 rounded-md self-end"
            >
            Download Approved CSV
            </button> */}
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-4">
          <div>
            <label className="mr-2">Items per page:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="p-2 border rounded-md"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-300 rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span className="mx-2">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage * itemsPerPage >= payments.length}
              className="px-4 py-2 bg-gray-300 rounded-md disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {/* Paginated Payments Table */}
        {loading ? (
          <p className="text-center text-lg">Loading payments...</p>
        ) : paginatedPayments.length === 0 ? (
          <p className="text-center text-lg text-gray-500">No payments found.</p>
        ) : (
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4 text-left">Debtor Name</th>
                <th className="p-4 text-left">Branch</th>
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Payment Date</th>
                <th className="p-4 text-left">Uploaded At</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-gray-100 cursor-pointer">
                  <td className="p-4">{payment.debtors?.debtor_name || "Unknown"}</td>
                  <td className="p-4">{payment.debtors?.client || "Unknown"}</td>
                  <td className="p-4">KES {payment.amount.toLocaleString()}</td>
                  <td className="p-4">{new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td className="p-4">{new Date(payment.uploaded_at).toLocaleDateString()}</td>
                  <td className="p-4">{payment.verified ? "✅ Verified" : "⏳ Pending"}</td>
                  <td className="p-4">
                    <button onClick={() => router.push(`/dashboard/payments/${payment.id}`)} className="bg-blue-600 text-white px-3 py-1 rounded-md">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
