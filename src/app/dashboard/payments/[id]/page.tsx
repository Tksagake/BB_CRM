"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";

// Define the types for your data
interface DebtorData {
  debtor: {
    id: string;
    // other properties...
  };
  // other properties...
}

interface ParserError {
  message: string;
  // other properties...
}

// Type guard to check if data is DebtorData
function isDebtorData(data: any): data is DebtorData {
  return (data as DebtorData).debtor !== undefined;
}

export default function PaymentDetailsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { id } = useParams();
  const [payment, setPayment] = useState<any>(null);
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPoP, setNewPoP] = useState<File | null>(null);

  useEffect(() => {
    async function fetchData() {
      // Check if the user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Get user role (admin or agent)
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(userData?.role);

      // Fetch the payment details for this specific payment ID
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          debtor:debtors(debtor_name, id)  -- Ensure debtor id is included
        `)
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error fetching payment:", error?.message || "Payment not found.");
        router.push("/dashboard/payments"); // Redirect if there's an error or no payment found
        return; // Stop further processing if no data or error occurs
      }

      // Use the type guard to check if data is DebtorData
      if (isDebtorData(data)) {
        if (!data.debtor || !data.debtor.id) {
          console.error("Debtor information is missing or invalid for this payment");
          alert("Debtor information is missing or invalid.");
          return;
        }
      } else {
        console.error("Unexpected data format:", data);
        return;
      }

      setPayment(data);
      setLoading(false);
    }

    fetchData();
  }, [supabase, id, router]);

  // Approve the payment without reducing the debt
  async function approvePayment() {
    if (!payment || !payment.debtor?.id) {
      console.error("Debtor ID is missing or payment is undefined");
      alert("Debtor ID is missing or payment is undefined");
      return;
    }

    // Now update the payment record as verified
    const { error: approveError } = await supabase.from("payments").update({ verified: true }).eq("id", id);
    if (approveError) {
      console.error("Error approving payment:", approveError.message);
      return;
    }

    console.log("Payment approved!");

    // Update payment state to reflect the change
    setPayment({ ...payment, verified: true });
  }

  // Upload a new PoP (Proof of Payment)
  async function uploadNewPoP() {
    if (!newPoP) return;

    const filePath = `pops/${id}.${newPoP.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage.from("payments").upload(filePath, newPoP, {
      upsert: true,
    });

    if (uploadError) {
      alert(`Error uploading file: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("payments").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("payments")
      .update({ pop_url: urlData.publicUrl, verified: false })
      .eq("id", id);

    if (!updateError) {
      alert("PoP updated successfully!");
      setPayment({ ...payment, pop_url: urlData.publicUrl, verified: false });
    }
  }

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  return (
    <div className="flex min-h-screen w-full">
       <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Payment Details</h2>

        {payment ? (
          <>
            <p><strong>Branch:</strong> {payment.debtor?.debtor_name || "Unknown"}</p>
            <p><strong>Amount:</strong> KES {payment.amount.toLocaleString()}</p>
            <p><strong>Status:</strong> {payment.verified ? "✅ Verified" : "⏳ Pending"}</p>

            <h3 className="mt-6 text-xl font-semibold">Proof of Payment</h3>
            {payment.pop_url && (
                <a href={payment.pop_url} target="_blank" className="text-blue-600 underline">
                View PoP
                </a>
                )}

                {(userRole === "admin" || userRole === "client") && !payment.verified && (
                <button onClick={approvePayment} className="bg-green-600 text-white px-4 py-2 rounded-md mt-4">
                Approve Payment
                </button>
              )}

              {userRole === "agent" || userRole === "admin" && (
              <>
                <input type="file" onChange={(e) => setNewPoP(e.target.files?.[0] || null)} />
                <button onClick={uploadNewPoP} className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4">
                  Re-upload PoP
                </button>
              </>
            )}
          </>
        ) : (
          <p>Payment not found.</p>
        )}
      </main>
    </div>
  );
}
