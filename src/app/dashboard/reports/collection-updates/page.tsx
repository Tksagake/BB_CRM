"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

export default function CollectionUpdatesPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | "debtor" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [collectionUpdates, setCollectionUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUpdates, setFilteredUpdates] = useState<any[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>(dayjs().format("YYYY-MM")); // Default to current month
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Number of items per page
  const [timeFilter, setTimeFilter] = useState<"all" | "monthly" | "weekly" | "daily">("all");

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

      // Fetch collection updates
      let updatesQuery = supabase
        .from("collection_updates")
        .select("*, debtors(debtor_name, client), users(full_name)")
        .order("update_date", { ascending: false });

      if (userData.role === "client") {
        // Filter updates by client's full name
        updatesQuery = updatesQuery.eq("debtors.client", userData.full_name);
      }

      const { data: updatesData, error: updatesError } = await updatesQuery;

      if (updatesError) {
        console.error("Error fetching collection updates:", updatesError.message);
      } else {
        console.log("Fetched updates data:", updatesData); // Log fetched data
        setCollectionUpdates(updatesData);
        filterData(updatesData, searchQuery, monthFilter, timeFilter);
      }

      setLoading(false);
    }

    fetchUserData();
  }, [supabase, router]);

  // Filter data based on search query, time filter, and month filter
  const filterData = (data: any[], query: string, month: string, time: string) => {
    const filtered = data.filter((update) => {
      const updateDate = dayjs(update.update_date);
      const updateMonth = updateDate.format("YYYY-MM");
      const today = dayjs();

      // Time filter
      let timeMatch = true;
      if (time === "daily") {
        timeMatch = updateDate.isSame(today, "day");
      } else if (time === "weekly") {
        timeMatch = updateDate.isSame(today, "week");
      } else if (time === "monthly") {
        timeMatch = month === "all" || updateMonth === month;
      }

      // Search query
      const queryMatch =
        update.debtors?.debtor_name &&
        (update.debtors?.debtor_name.toLowerCase().includes(query.toLowerCase()) ||
          update.collection_notes.toLowerCase().includes(query.toLowerCase()) ||
          (update.users?.full_name && update.users.full_name.toLowerCase().includes(query.toLowerCase())));

      return timeMatch && queryMatch;
    });

    setFilteredUpdates(filtered);
    setCurrentPage(1); // Reset to the first page after filtering
  };

  // Search Functionality
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterData(collectionUpdates, query, monthFilter, timeFilter);
  };

  // Month filter handler
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const month = e.target.value;
    setMonthFilter(month);
    filterData(collectionUpdates, searchQuery, month, timeFilter);
  };

  // Handle time filter change
  const handleTimeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const time = e.target.value as "all" | "monthly" | "weekly" | "daily";
    setTimeFilter(time);
    filterData(collectionUpdates, searchQuery, monthFilter, time);
  };

  // Pagination logic
  const paginatedUpdates = filteredUpdates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUpdates.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) return <p className="text-center mt-10 text-xl">Loading...</p>;

  // Redirect debtors as they should not see this page
  if (userRole === "debtor") {
    router.push("/access-denied");
    return null;
  }

  function exportToExcel(event: React.MouseEvent<HTMLButtonElement>): void {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredUpdates
        .filter(update => update.debtors?.debtor_name)
        .map(update => ({
          "Debtor Name": update.debtors?.debtor_name,
          "Update Date": update.update_date,
          "Collection Notes": update.collection_notes
        }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Collection Updates");

    XLSX.writeFile(workbook, "collection_updates.xlsx");
  }

  // Generate month options (current year and previous year)
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = dayjs();
    const currentYear = currentDate.year();
    const currentMonth = currentDate.month() + 1; // 1-12
    
    // Add "All" option
    options.push(<option key="all" value="all">All Months</option>);
    
    // Add months for current year
    for (let month = 1; month <= currentMonth; month++) {
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const date = dayjs(`${currentYear}-${monthStr}-01`);
      options.push(
        <option key={`${currentYear}-${monthStr}`} value={`${currentYear}-${monthStr}`}>
          {date.format("MMMM YYYY")}
        </option>
      );
    }
    
    // Add months for previous year
    for (let month = 1; month <= 12; month++) {
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const date = dayjs(`${currentYear - 1}-${monthStr}-01`);
      options.push(
        <option key={`${currentYear - 1}-${monthStr}`} value={`${currentYear - 1}-${monthStr}`}>
          {date.format("MMMM YYYY")}
        </option>
      );
    }
    
    return options;
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Navbar */}
      <Navbar handleLogout={async () => { await supabase.auth.signOut(); await router.push("/login"); }} />

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Collection Updates</h2>
          <button
            onClick={exportToExcel}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Export to Excel
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search updates..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Time Filter */}
          <div className="w-48">
            <select
              value={timeFilter}
              onChange={handleTimeFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="w-48">
            <select
              value={monthFilter}
              onChange={handleMonthChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {generateMonthOptions()}
            </select>
          </div>
        </div>

        {/* Collection Updates Table */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="px-4 py-2 border">Debtor Name</th>
                <th className="px-4 py-2 border">Update Date</th>
                <th className="px-4 py-2 border">Collection Notes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUpdates.length > 0 ? (
                paginatedUpdates.map((update) => (
                  <tr key={update.id} className="hover:bg-gray-100">
                    {update.debtors?.debtor_name ? (
                      <>
                        <td className="px-4 py-2 border">{update.debtors?.debtor_name}</td>
                        <td className="px-4 py-2 border">{dayjs(update.update_date).format("DD/MM/YYYY")}</td>
                        <td className="px-4 py-2 border">{update.collection_notes}</td>
                      </>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-2 border text-center text-gray-500">
                    No updates found for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(totalPages, prev + 1)
                )
              }
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
              setCurrentPage(1); // Reset to the first page
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