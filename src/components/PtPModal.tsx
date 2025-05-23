import React, { useState } from 'react';

interface Ptp {
  id: string;
  status: string;
  amount_paid: number;
}

const PtpModal = ({ ptp, onSave, onClose }: { ptp: Ptp; onSave: (id: string, status: string, amountPaid: number) => void; onClose: () => void }) => {
  const [status, setStatus] = useState(ptp.status);
  const [amountPaid, setAmountPaid] = useState(ptp.amount_paid);

  const handleSave = () => {
    onSave(ptp.id, status, amountPaid);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4">Update PTP</h2>
        <label className="block mb-2">Status:</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full p-2 border rounded-md mb-4"
        >
          <option value="pending">Pending</option>
          <option value="partially_honored">Partially Honored</option>
          <option value="fully_honored">Fully Honored</option>
        </select>
        <label className="block mb-2">Amount Paid:</label>
        <input
          type="number"
          value={amountPaid}
          onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
          className="w-full p-2 border rounded-md mb-4"
        />
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 mr-2 bg-gray-300 rounded-md">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
        </div>
      </div>
    </div>
  );
};

export default PtpModal;
