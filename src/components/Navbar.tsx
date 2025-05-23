"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Users,
  DollarSign,
  FileText,
  Phone,
  ChevronDown,
  Download,
} from "lucide-react";

interface NavbarProps {
  handleLogout: () => Promise<void>;
}

export default function Navbar({ handleLogout }: NavbarProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const [userRole, setUserRole] = useState<"admin" | "agent" | "client" | null>(null);

  useEffect(() => {
    async function fetchUserRole() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!error && data) {
          setUserRole(data.role);
        }
      }
    }

    fetchUserRole();
  }, [supabase]);

  return (
    <aside className="w-72 bg-blue-900 bg-opacity-90 backdrop-blur-lg text-white p-6 h-screen flex flex-col fixed left-0 top-0 shadow-xl overflow-y-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-white">
        BLUEBERRY VOYAGE LIMITED
        </h2>
      <nav className="flex-1 space-y-3">
       <DropdownMenu label="Dashboard" icon={<Home />}>
          <NavItem link="/dashboard" label="Overview" activePath={pathname} />
        </DropdownMenu>
      
        <DropdownMenu label="Debtors" icon={<Users />}>
          {userRole !== "client" && (
            <NavItem link="/dashboard/debtors/follow-ups" label="Follow-Ups" activePath={pathname} />
          )}
          <NavItem link="/dashboard/debtors" label="View Debtors" activePath={pathname} />
          {userRole === "admin" && (
            <NavItem link="/dashboard/debtors/import" label="Add Debtors" activePath={pathname} />
          )}
        </DropdownMenu>

        <DropdownMenu label="Payments" icon={<DollarSign />}>
          {userRole === "client" && (
            <NavItem link="/dashboard/payments" label="Payment Tracking" activePath={pathname} />
          )}
          {(userRole === "admin" || userRole === "agent") && (
            <>
              <NavItem link="/dashboard/payments/upload" label="Upload PoP" activePath={pathname} />
              {userRole === "agent" && (
                <NavItem link="/dashboard/payments/agentview" label="Payments Posted" activePath={pathname} />
              )}
            </>
          )}
          {userRole === "admin" && (
            <NavItem link="/dashboard/payments/payments" label="Payment Tracking" activePath={pathname} />
          )}
        </DropdownMenu>

        <DropdownMenu label="Reports" icon={<FileText />}>
          {userRole !== "client" && (
            <>
               {/*  <NavItem link="/dashboard/reports/monthly" label="Monthly Reports" activePath={pathname} /> */}
              <NavItem link="/dashboard/reports/ptp" label="PtP" activePath={pathname} />
            </>
          )}
          {userRole === "admin" && (
            <>
             {/*    <NavItem link="/dashboard/reports/performance" label="Agent Performance" activePath={pathname} />
            <NavItem link="/dashboard/reports/agent-ptp" label="PtPs" activePath={pathname} /> */}
            <NavItem link="/dashboard/reports/agent-activities" label="Agent Activities" activePath={pathname} />
            </>
          )}
          {userRole !== "agent" && (
            <NavItem link="/dashboard/reports/collection-updates" label="Collection Updates" activePath={pathname} />
          )}
        </DropdownMenu>

        {userRole === "admin" && (
          <>
            <DropdownMenu label="Communication" icon={<Phone />}>
              <NavItem link="/dashboard/communication/calls" label="Call Log" activePath={pathname} />
            </DropdownMenu>

           {/*  <DropdownMenu label="Export Data" icon={<Download />}>
              <NavItem link="/dashboard/export" label="Export" activePath={pathname} />
            </DropdownMenu>
            */}

            <DropdownMenu label="Users" icon={<Users />}>
              <NavItem link="/dashboard/users" label="Users" activePath={pathname} />
            </DropdownMenu>
          </>
        )}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-8 p-3 bg-red-500 w-full rounded-lg hover:bg-red-600 transition-all duration-300 font-semibold tracking-wide shadow-md flex items-center gap-3 justify-center"
      >
        <Home className="w-5 h-5" /> Logout
      </button>
    </aside>
  );
}

interface NavItemProps {
  link: string;
  label: string;
  icon?: React.ReactNode;
  activePath: string;
}

function NavItem({ link, label, icon, activePath }: NavItemProps) {
  const isActive = activePath === link;

  return (
    <li>
      <a
        href={link}
        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
          isActive ? "bg-blue-700 text-white shadow-lg" : "hover:bg-blue-700"
        }`}
      >
        {icon} <span className="text-lg">{label}</span>
      </a>
    </li>
  );
}

interface DropdownMenuProps {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

function DropdownMenu({ label, children, icon }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full p-3 rounded-lg hover:bg-blue-700 transition-all duration-300 text-lg"
      >
        <span className="flex items-center gap-3">
          {icon} {label}
        </span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <ul
        className={`ml-5 space-y-2 overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </ul>
    </div>
  );
}