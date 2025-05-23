"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

// Define the type for follow-up items
interface FollowUpItem {
  total_paid: number;
  balance_due: any;
  id: any;
  debtor_name: any;
  client: any;
  debtor_phone: any;
  debt_amount: any;
  next_followup_date: any;
  deal_stage: any;
  collection_update: any;
  assigned_to: {
    // Define the structure of assigned_to if needed
  }[];
}

export default function FollowUpsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUpItem[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Define the deal stages as an array of objects
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
    { value: "9", label: "Payment Confirmed by Client" },
    { value: "10", label: "Debt Settled" },
    { value: "14", label: "Non-Committal" },
    { value: "11", label: "Disputing" },
    { value: "12", label: "Legal" },
    { value: "26", label: "Requesting More Information" },
    {value: "27", label: "Wrong Number" },
    {value: "28", label: "Phone switched off" },
    {value: "29", label: "No contact provided" },
    {value: "30", label: "On Hold"},
    {value: "31", label: "Invalid Email"},
    {value: "32", label: "Invalid Phone Number"},
    {value: "33", label: "Out of Service"},
    {value: "34", label: "Not in Service"},
    { value: "45", label: "Account closed"},
    {value: "46", label: "Account Recalled"},
    { value: "46", label: "Buy-off in Progress" },
  { value: "47", label: "Check-off Payment" },
  { value: "49", label: "Pending" },
  { value: "48", label: "Pending Booking" }
   
  ];

  // Function to get the label for a deal stage value
  const getDealStageLabel = (value: string) => {
    const stage = dealStages.find((stage) => stage.value === value);
    return stage ? stage.label : "Pending";
  };

  // Function to download data as CSV
  const downloadCsv = (data: any[], filename: string) => {
    const headers = [
      "Debtor Name",
      "Client (Company)",
      "Phone",
      "Total Debt",
      "Total Paid",
      "Remaining Balance",
      "Follow-Up Date",
      "Deal Stage",
      "Notes",
      "Assigned Agent",
    ];

    const rows = data.map((debtor) => [
      `"${debtor.debtor_name}"`, // Wrap in quotes
      `"${debtor.client}"`, // Wrap in quotes
      `"${debtor.debtor_phone}"`, // Wrap in quotes
      `"KES ${debtor.debt_amount.toLocaleString()}"`, // Wrap in quotes
      `"KES ${debtor.total_paid.toLocaleString()}"`, // Wrap in quotes
      `"KES ${debtor.balance_due.toLocaleString()}"`, // Wrap in quotes
      `"${debtor.next_followup_date}"`, // Wrap in quotes
      `"${getDealStageLabel(debtor.deal_stage)}"`, // Wrap in quotes
      `"${debtor.collection_update || "N/A"}"`, // Wrap in quotes
      `"${debtor.assigned_to?.full_name || "Unassigned"}"`, // Wrap in quotes
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    async function fetchFollowUps() {
      const today = new Date().toISOString().split("T")[0];

      // Fetch the logged-in user's role and ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, id")
        .eq("id", user.id)
        .single();

      if (userError || !userData) {
        console.error("Error fetching user data:", userError?.message || userError);
        router.push("/login");
        return;
      }

      setUserRole(userData.role);
      setUserId(userData.id);

      // Fetch debtors whose follow-up date is today or overdue
      let query = supabase
        .from("debtors")
        .select("id, debtor_name, client, debtor_phone, debt_amount, next_followup_date, deal_stage, collection_update, assigned_to (full_name)")
        .lte("next_followup_date", today)
        .order("next_followup_date", { ascending: true });

      // If the user is an agent, filter debtors assigned to them
      if (userData.role === "agent") {
        query = query.eq("assigned_to", userData.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching follow-ups:", error.message);
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
            };
          })
        );

        // Separate into today's and overdue follow-ups
        const todayList = debtorsWithPayments.filter((d) => d.next_followup_date === today);
        const overdueList = debtorsWithPayments.filter((d) => d.next_followup_date < today);

        setTodayFollowUps(todayList);
        setOverdueFollowUps(overdueList);
      }
      setLoading(false);
    }

    fetchFollowUps();
  }, [supabase, router]);

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Follow-Ups</h2>

        {loading ? (
          <p className="text-center text-lg">Loading follow-ups...</p>
        ) : (
          <>
            {/* Section: Today's Follow-Ups */}
            <FollowUpTable
              title="Today's Follow-Ups"
              data={todayFollowUps}
              router={router}
              getDealStageLabel={getDealStageLabel}
              onExport={() => downloadCsv(todayFollowUps, "today_followups.csv")}
              highlight
              userRole={userRole}
            />

            {/* Section: Overdue Follow-Ups */}
            <FollowUpTable
              title="Overdue Follow-Ups"
              data={overdueFollowUps}
              router={router}
              getDealStageLabel={getDealStageLabel}
              onExport={() => downloadCsv(overdueFollowUps, "overdue_followups.csv")}
              userRole={userRole}
            />
          </>
        )}
      </main>
    </div>
  );
}

// Reusable Table Component
function FollowUpTable({
  title,
  data,
  router,
  getDealStageLabel,
  onExport,
  highlight = false,
  userRole,
}: {
  title: string;
  data: any[];
  router: any;
  getDealStageLabel: (value: string) => string;
  onExport: (data: any[]) => void;
  highlight?: boolean;
  userRole: "admin" | "agent" | "client" | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = data.filter((debtor) =>
    debtor.debtor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-xl font-semibold ${highlight ? "text-red-600" : "text-gray-800"}`}>
          {title} ({filteredData.length})
        </h3>
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border p-2 rounded-md"
          />
          {userRole !== "agent" && (
            <button
              onClick={() => onExport(filteredData)}
              className="bg-green-600 text-white px-4 py-2 rounded-md"
            >
              Export as CSV
            </button>
          )}
        </div>
      </div>

      {filteredData.length === 0 ? (
        <p className="text-gray-500">No {title.toLowerCase()}.</p>
      ) : (
        <>
          <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4 text-left">Debtor Name</th>
                <th className="p-4 text-left">Client (Company)</th>
                <th className="p-4 text-left">Phone</th>
                <th className="p-4 text-left">Total Debt</th>
                <th className="p-4 text-left">Total Paid</th>
                <th className="p-4 text-left">Remaining Balance</th>
                <th className="p-4 text-left">Follow-Up Date</th>
                <th className="p-4 text-left">Deal Stage</th>
                <th className="p-4 text-left">Notes</th>
                <th className="p-4 text-left">Assigned Agent</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((debtor) => (
                <tr
                  key={debtor.id}
                  className="border-b hover:bg-gray-100 cursor-pointer"
                  onClick={() => router.push(`/dashboard/debtors/${debtor.id}`)}
                >
                  <td className="p-4 text-blue-600 hover:underline">{debtor.debtor_name}</td>
                  <td className="p-4">{debtor.client}</td>
                  <td className="p-4">{debtor.debtor_phone}</td>
                  <td className="p-4">KES {debtor.debt_amount.toLocaleString()}</td>
                  <td className="p-4">KES {debtor.total_paid.toLocaleString()}</td>
                  <td className="p-4">KES {debtor.balance_due.toLocaleString()}</td>
                  <td className="p-4">{debtor.next_followup_date}</td>
                  <td className="p-4">{getDealStageLabel(debtor.deal_stage)}</td>
                  <td className="p-4">{debtor.collection_update || "N/A"}</td>
                  <td className="p-4">{debtor.assigned_to?.full_name || "Unassigned"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Updated Pagination to match debtors page exactly */}
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
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(
                  totalPages,
                  prev + 1
                ))}
                disabled={currentPage === totalPages}
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
        </>
      )}
    </div>
  );
}