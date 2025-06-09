"use client";

import { useState } from "react";
import { publicKey, sol } from "@metaplex-foundation/umi";
import { transferSol } from "@metaplex-foundation/mpl-toolbox";
import sendAndConfirmWalletAdapter from "../lib/umi/sendAndConfirmWithWalletAdapter";
import useUmiStore from "@/store/useUmiStore";

export default function SendSol() {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const umi = useUmiStore.getState().umi;
      const sender = useUmiStore.getState().signer;

      // Build transaction
      const tx = transferSol(umi, {
        source: sender,
        destination: publicKey(destination),
        amount: sol(Number(amount)),
      });

      const result = await sendAndConfirmWalletAdapter(tx);
      setStatus(`✅ Sent! Tx Signature: ${result.signature}`);
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Send SOL</h2>
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label htmlFor="destination" className="block text-sm font-medium">
            Destination Address
          </label>
          <input
            type="text"
            id="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
            required
          />
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium">
            Amount (SOL)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 p-2 border rounded"
            min="0"
            step="0.01"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Sending..." : "Send SOL"}
        </button>
        {status && <p className="mt-2 text-sm">{status}</p>}
      </form>
    </div>
  );
}

