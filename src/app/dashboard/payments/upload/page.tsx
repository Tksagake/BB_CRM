"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Navbar from "@/components/Navbar";
import router from "next/router";

export default function UploadPoPPage() {
  const supabase = createClientComponentClient();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" |null>(null);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [filteredDebtors, setFilteredDebtors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDebtor, setSelectedDebtor] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [popFile, setPopFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false); // Track dropdown state

  useEffect(() => {
    async function fetchUserAndDebtors() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(userData?.role);

      let debtorsQuery = supabase.from("debtors").select("id, debtor_name");

      if (userData?.role === "agent") {
        debtorsQuery = debtorsQuery.eq("assigned_to", user.id);
      }

      const { data: debtorsData } = await debtorsQuery;

      setDebtors(debtorsData || []);
      setFilteredDebtors(debtorsData || []);
    }

    fetchUserAndDebtors();
  }, [supabase]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value.toLowerCase();
    setSearchTerm(searchValue);
    setDropdownOpen(true);

    const filtered = debtors.filter((debtor) =>
      debtor.debtor_name.toLowerCase().includes(searchValue)
    );

    setFilteredDebtors(filtered);
  };

  const selectDebtor = (debtor: any) => {
    setSelectedDebtor(debtor.id);
    setSearchTerm(debtor.debtor_name);
    setDropdownOpen(false);
  };

  async function uploadPoP() {
    if (!selectedDebtor || !amount || !popFile || !paymentDate) {
      setMessage("❌ Please fill in all fields.");
      return;
    }

    setLoading(true);
    setMessage("");

    const fileExt = popFile.name.split(".").pop();
    const filePath = `pops/${selectedDebtor}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("payments").upload(filePath, popFile, {
      upsert: true,
    });

    if (uploadError) {
      setMessage(`❌ Error uploading PoP: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("payments").getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("payments").insert([
      {
        debtor_id: selectedDebtor,
        amount: parseFloat(amount),
        pop_url: urlData.publicUrl,
        pop_file_type: fileExt,
        verified: false,
        payment_date: paymentDate,
      },
    ]);

    if (insertError) {
      setMessage(`❌ Error saving payment record: ${insertError.message}`);
    } else {
      setMessage("✅ PoP uploaded successfully! Awaiting admin approval.");
      setAmount("");
      setSelectedDebtor("");
      setPopFile(null);
      setPaymentDate("");
      setSearchTerm("");
      setFilteredDebtors(debtors);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Upload Proof of Payment</h2>

        {message && (
          <div className={`p-3 mb-4 rounded-md text-white ${message.includes("✅") ? "bg-green-600" : "bg-red-600"}`}>
            {message}
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-lg">
          {/* 🔍 Searchable Debtor Dropdown */}
          <label className="block text-gray-700 font-medium mb-2">Select Debtor:</label>
          <div className="relative">
            <input
              type="text"
              className="border p-2 rounded-md w-full mb-2 focus:ring-2 focus:ring-blue-400"
              placeholder="Search or select debtor..."
              value={searchTerm}
              onChange={handleSearch}
              onFocus={() => setDropdownOpen(true)}
            />
            {dropdownOpen && filteredDebtors.length > 0 && (
              <ul className="absolute left-0 w-full bg-white shadow-lg rounded-md max-h-40 overflow-y-auto border mt-1 z-10">
                {filteredDebtors.map((debtor) => (
                  <li
                    key={debtor.id}
                    onClick={() => selectDebtor(debtor)}
                    className="p-2 cursor-pointer hover:bg-blue-100"
                  >
                    {debtor.debtor_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Payment Amount */}
          <label className="block text-gray-700 font-medium mb-2">Payment Amount (KES):</label>
          <input
            type="number"
            className="border p-2 rounded-md w-full mb-4 focus:ring-2 focus:ring-green-400"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {/* Date of Payment */}
          <label className="block text-gray-700 font-medium mb-2">Date of Payment:</label>
          <input
            type="date"
            className="border p-2 rounded-md w-full mb-4 focus:ring-2 focus:ring-yellow-400"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />

          {/* File Upload */}
          <label className="block text-gray-700 font-medium mb-2">Upload PoP:</label>
          <input
            type="file"
            onChange={(e) => setPopFile(e.target.files?.[0] || null)}
            className="border p-2 w-full mb-4 bg-gray-50 focus:ring-2 focus:ring-purple-400"
          />

          {/* Upload Button */}
          <button
            onClick={uploadPoP}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md transition-transform transform hover:scale-105 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload PoP"}
          </button>
        </div>
      </main>
    </div>
  );
}
