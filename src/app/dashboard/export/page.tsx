"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { saveAs } from 'file-saver';
import Navbar from "@/components/Navbar";

interface Message {
  text: string;
  type: "success" | "error";
}

export default function ExportDebtorsPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

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
    { value: "27", label: "Wrong Number" },
    { value: "28", label: "Phone switched off" },
    { value: "29", label: "No contact provided" },
    { value: "30",   lable: "On Hold"},
    { value: "31",   lable: "Invalid Email"},
    { value: "32",   lable: "Invalid Phone Number"},
    { value: "33",   lable: "Out of Service"},
    { value: "34",   lable: "Not in Service"},
    { value: "46", label: "Buy-off in Progress" },
  { value: "47", label: "Check-off Payment" },
  { value: "48", label: "Pending Booking" }
  ];

  const exportAllDebtors = async () => {
    setLoading(true);
    setMessage(null);

    // Fetch all debtors
    const { data: debtors, error } = await supabase
      .from("debtors")
      .select(`
        *,
        users:assigned_to(full_name)
      `);

    if (error) {
      setMessage({ text: `Error fetching debtors: ${error.message}`, type: "error" });
      setLoading(false);
      return;
    }

    console.log(`Total debtors fetched: ${debtors.length}`);

    // Process debtors to include payments and other necessary data
    const debtorsWithPayments = await Promise.all(
      debtors.map(async (debtor) => {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("amount")
          .eq("debtor_id", debtor.id);

        if (paymentsError) {
          console.error("Error fetching payments for debtor ID:", debtor.id, paymentsError.message);
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

    console.log(`Total debtors processed with payments: ${debtorsWithPayments.length}`);

    // Export as CSV
    const headers = [
      "Debtor Name",
      "Branch (Manager)",
      "Phone",
      "Total Debt",
      "Total Paid",
      "Remaining Balance",
      "Next Follow-Up",
      "Assigned Agent",
      "Deal Stage",
    ];

    const csvContent = [
      headers.join(","),
      ...debtorsWithPayments.map(debtor => [
        debtor.debtor_name,
        debtor.client,
        debtor.debtor_phone,
        debtor.debt_amount,
        debtor.total_paid,
        debtor.balance_due,
        debtor.next_followup_date,
        debtor.users?.full_name || "Unassigned",
        debtor.deal_stage_label,
      ].join(",")),
    ].join("\n");

    console.log(`CSV Content Length: ${csvContent.split('\n').length} rows`);

    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: "text/csv" });

    // Use the FileSaver.js library to save the file
    saveAs(blob, "all_debtors.csv");

    setLoading(false);
    setMessage({ text: "Export completed successfully!", type: "success" });
  };

  function handleLogout(): Promise<void> {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <Navbar handleLogout={handleLogout} />
      <h2 className="text-3xl font-bold mb-4">Export All Debtors</h2>
      <button
        onClick={exportAllDebtors}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        {loading ? "Exporting..." : "Export All Debtors"}
      </button>
      {message && (
        <div
          className={`mt-4 p-3 rounded-md text-white ${
            message.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
