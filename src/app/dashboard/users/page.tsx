"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { v4 as uuidv4 } from "uuid"; // Import the UUID library
import Navbar from "@/components/Navbar";

export default function UsersPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>(""); // Add this line to define userRole

  const [newUser, setNewUser] = useState({
    id: "", // Add this field
    full_name: "",
    email: "",
    password: "",
    role: "agent",
    phone: "",
    client_company: "",
  });
  useEffect(() => {
    fetchUsers();
    // Fetch the user role and set it
    async function fetchUserRole() {
      const { data, error } = await supabase.auth.getUser();
      if (data) {
        if (data.user && data.user.role) {
          setUserRole(data.user.role); // Assuming the role is stored in the user object
        } else {
          setUserRole(""); // Provide a default value if user or role is undefined
        }
      }
    }
    fetchUserRole();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("*");
    if (error) {
      console.error("Error fetching users:", error.message);
    } else {
      setUsers(data);
    }
    setLoading(false);
  }

  // Function to check if an email already exists
  async function checkEmailExists(email: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Error checking email:", error.message);
      return false;
    }

    return !!data; // Returns true if the email exists, false otherwise
  }

  async function createUser() {
    if (!newUser.email || !newUser.full_name || !newUser.password) {
      alert("Name, email, and password are required.");
      return;
    }

    // Check if the email already exists
    const emailExists = await checkEmailExists(newUser.email);
    if (emailExists) {
      alert("User with this email already exists.");
      return;
    }

    // Generate a UUID for the new user
    const userId = uuidv4();

    // Add the generated UUID to the newUser object
    const userData = {
      ...newUser,
      id: userId, // Include the generated UUID
    };

    // Send the request to the API
    const response = await fetch("/api/createUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const result = await response.json();
    if (!response.ok) {
      alert(`User created successfully! Refresh the page`);
      return;
    }

    alert("User created successfully!");
    setShowCreateModal(false);
    fetchUsers();
  }

  async function updateUser() {
    if (!selectedUser) return;

    const { error } = await supabase.from("users").update(selectedUser).eq("id", selectedUser.id);
    if (error) {
      alert(`Error updating user: ${error.message}`);
    } else {
      alert("User updated successfully!");
      setShowEditModal(false);
      fetchUsers();
    }
  }

  async function deleteUser(userId: string, role: string) {
    if (role === "admin") {
      alert("You cannot delete another admin.");
      return;
    }

    if (!confirm("Are you sure you want to delete this user?")) return;

    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) {
      alert(`Error deleting user: ${error.message}`);
    } else {
      alert("User deleted successfully!");
      fetchUsers();
    }
  }
  // Redirect debtors as they should not see this page
  if (userRole === "debtor") {
    router.push("/access-denied");
    return null;
  }

  return (
    <div className="flex min-h-screen w-full">
      <Navbar handleLogout={function (): Promise<void> {
              throw new Error("Function not implemented.");
          } } />
      <main className="ml-64 flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">User Management</h2>

        {/* Create User Button */}
        <button onClick={() => setShowCreateModal(true)} className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-md">
          + Create New User
        </button>

        {/* Users Table */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-3xl font-bold text-gray-800 mb-2"> Users List</h2>
          <p className="text-gray-600 mb-4">Manage your users here.</p>

          {/* Loading State */}
          {loading ? (
            <p>Loading users...</p>
            
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="px-4 py-2 border">Full Name</th>
                  <th className="px-4 py-2 border">Email</th>
                  <th className="px-4 py-2 border">Phone</th>
                  <th className="px-4 py-2 border">Role</th>
                  
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-4 py-2 border">{user.full_name}</td>
                    <td className="px-4 py-2 border">{user.email}</td>
                    <td className="px-4 py-2 border">{user.phone || "N/A"}</td>
                    <td className="px-4 py-2 border">{user.role}</td>
                    
                    <td className="px-4 py-2 border text-center">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditModal(true);
                        }}
                        className="bg-yellow-600 text-white px-3 py-1 rounded-md mr-2"
                      >
                        Edit
                      </button>
                      {user.role !== "admin" && (
                        <button
                          onClick={() => deleteUser(user.id, user.role)}
                          className="bg-red-600 text-white px-3 py-1 rounded-md"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[500px] shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Create New User</h3>
              <input type="text" placeholder="Full Name" className="border p-2 rounded-md w-full mb-4" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
              <input type="email" placeholder="Email" className="border p-2 rounded-md w-full mb-4" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              <input type="password" placeholder="Password" className="border p-2 rounded-md w-full mb-4" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <input type="text" placeholder="Phone (Optional)" className="border p-2 rounded-md w-full mb-4" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
                <input type="text" placeholder="Client Company (Optional)" className="border p-2 rounded-md w-full mb-4" value={newUser.client_company} onChange={(e) => setNewUser({ ...newUser, client_company: e.target.value })} />
                <select className="border p-2 rounded-md w-full mb-4" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="agent">Agent</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex">
                  <button onClick={() => setShowCreateModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md mr-2 flex-1">Cancel</button>
                  <button onClick={createUser} className="bg-blue-600 text-white px-4 py-2 rounded-md flex-1">Create User</button>
                </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg w-[500px] shadow-lg">
              <h3 className="text-2xl font-semibold mb-4 text-gray-800">Edit User</h3>
              <input type="text" placeholder="Full Name" className="border p-2 rounded-md w-full mb-4" value={selectedUser.full_name} onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })} />
              <input type="text" placeholder="Phone" className="border p-2 rounded-md w-full mb-4" value={selectedUser.phone} onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })} />
                <input type="text" placeholder="Client Company" className="border p-2 rounded-md w-full mb-4" value={selectedUser.client_company} onChange={(e) => setSelectedUser({ ...selectedUser, client_company: e.target.value })} />
                <select className="border p-2 rounded-md w-full mb-4" value={selectedUser.role} onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}>
                  <option value="agent">Agent</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
                <button onClick={() => setShowEditModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded-md mr-2">Cancel</button>
              <button onClick={updateUser} className="bg-blue-600 text-white px-4 py-2 rounded-md w-full">Update User</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}