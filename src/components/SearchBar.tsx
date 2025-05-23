import { useState, useEffect, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SearchBar() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [query, setQuery] = useState("");
  type Debtor = {
    id: string | number;
    debtor_name: string;
    debtor_phone: string;
    debtor_email: string;
    [key: string]: any;
  };
  const [results, setResults] = useState<Debtor[]>([]);

  useEffect(() => {
    async function fetchDebtors() {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("debtors")
        .select("*")
        .or(`debtor_name.ilike.%${query}%,debtor_phone.ilike.%${query}%,debtor_email.ilike.%${query}%`);

      if (!error && data) {
        setResults(data);
      }
    }

    fetchDebtors();
  }, [query, supabase]);

  const handleSearchChange = (e: { target: { value: SetStateAction<string>; }; }) => {
    setQuery(e.target.value);
  };

  const handleDebtorClick = (id: any) => {
    router.push(`/dashboard/debtors/${id}`);
  };

  return (
    <div className="relative text-black">
      <input
        type="text"
        placeholder="Search debtors..."
        value={query}
        onChange={handleSearchChange}
        className="w-full p-2 rounded-lg"
      />
      {results.length > 0 && (
        <ul className="absolute bg-white w-full mt-1 rounded-lg shadow-lg">
          {results.map((debtor) => (
            <li
              key={debtor.id}
              onClick={() => handleDebtorClick(debtor.id)}
              className="p-2 hover:bg-gray-200 cursor-pointer"
            >
              {debtor.debtor_name} - {debtor.debtor_phone} - {debtor.debtor_email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
