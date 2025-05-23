import { useState, useEffect } from "react";

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    full_name: string;
    email: string;
    phone?: string;
    client_company?: string;
    role: string;
  };
  onUpdate: (user: { full_name: string; email: string; phone?: string; client_company?: string; role: string }) => void;
}

export default function EditUserModal({ isOpen, onClose, user, onUpdate }: EditUserModalProps) {
  const [editedUser, setEditedUser] = useState(user);

  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    setEditedUser({ ...editedUser, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!editedUser.full_name || !editedUser.email) {
      alert("Full Name and Email are required!");
      return;
    }
    onUpdate(editedUser);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg w-[500px] shadow-lg">
        <h3 className="text-2xl font-semibold mb-4 text-gray-800">Edit User</h3>

        <input
          type="text"
          name="full_name"
          placeholder="Full Name"
          className="border p-2 rounded-md w-full mb-4"
          value={editedUser.full_name}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="border p-2 rounded-md w-full mb-4"
          value={editedUser.email}
          onChange={handleChange}
        />
        <input
          type="text"
          name="phone"
          placeholder="Phone (Optional)"
          className="border p-2 rounded-md w-full mb-4"
          value={editedUser.phone}
          onChange={handleChange}
        />
        <input
          type="text"
          name="client_company"
          placeholder="Client Company (Optional)"
          className="border p-2 rounded-md w-full mb-4"
          value={editedUser.client_company}
          onChange={handleChange}
        />
        <select
          name="role"
          className="border p-2 rounded-md w-full mb-4"
          value={editedUser.role}
          onChange={handleChange}
        >
          <option value="agent">Agent</option>
          <option value="client">Client</option>
          <option value="admin">Admin</option>
        </select>

        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-md">
            Cancel
          </button>
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded-md">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
