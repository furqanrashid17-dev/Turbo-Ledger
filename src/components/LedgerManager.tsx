import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2,
  FileText
} from "lucide-react";
import { Ledger, Transaction, Product } from "../types";

interface LedgerManagerProps {
  ledgers: Ledger[];
  transactions: Transaction[];
  products: Product[];
  onSaveLedger: (l: Ledger) => Promise<void>;
  onSaveTransaction: (tx: Transaction) => Promise<void>;
  onDeleteLedger: (id: string) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onSaveProduct: (p: Product) => Promise<void>;
}

export default function LedgerManager({
  ledgers,
  transactions,
  onSaveLedger,
  onSaveTransaction,
  onDeleteLedger
}: LedgerManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State Triggers
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);

  // Client Creation Form States
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  // Payment Log Form States
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  // Filter ledgers via search input match
  const filteredLedgers = ledgers.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return;

    const newLedger: Ledger = {
      id: `ledger_${Date.now()}`,
      name: clientName,
      phone: clientPhone,
      email: clientEmail,
      address: clientAddress,
      balance: 0, // Starts at zero debt
      totalPurchases: 0,
      updatedAt: new Date().toISOString(),
      userId: ""
    };

    await onSaveLedger(newLedger);
    setIsClientModalOpen(false);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setClientAddress("");
  };

  const handleOpenPaymentModal = (ledger: Ledger) => {
    setSelectedLedger(ledger);
    setIsPaymentModalOpen(true);
  };

  const handleLogManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedger || paymentAmount <= 0) return;

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type: "payment",
      ledgerId: selectedLedger.id,
      ledgerName: selectedLedger.name,
      totalAmount: 0, // Explicitly zero for pure payment collection records
      amountPaid: Number(paymentAmount),
      dueAmount: -Number(paymentAmount), // Negative amount directly reduces outstanding debit balance
      paymentMethod,
      date: `${paymentDate}T12:00:00.000Z`,
      notes: paymentNotes || "Manual payment received",
      userId: ""
    };

    // Commit payment voucher to transaction histories
    await onSaveTransaction(newTx);

    // Adjust selected client store's dynamic ledger balance sheet sequentially
    await onSaveLedger({
      ...selectedLedger,
      balance: selectedLedger.balance - Number(paymentAmount),
      updatedAt: new Date().toISOString()
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentNotes("");
  };

  return (
    <div className="space-y-6" id="ledger_workspace">
      
      {/* Search Filter Controls Row Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search clients or markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <button
          onClick={() => setIsClientModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-red-650 hover:bg-red-750 text-white font-mono font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add Store Client
        </button>
      </div>

      {/* Create New Client Storefront Dialog Overlay */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Register Distribution Client</h3>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Shop / Client Name *</label>
                <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Mazhar Karachi Auto" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Phone Number</label>
                  <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="e.g. +92 302..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Email Address</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@gmail.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Market Distribution Address</label>
                <input type="text" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="e.g. Canal Garden, Lahore" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
                <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-3 py-2 border border-slate-200 text-slate-600 font-mono text-xs rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-650 hover:bg-red-750 text-white font-mono font-bold text-xs rounded-xl transition-all shadow-xs">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Cash Flow Collection Dialog Overlay */}
      {isPaymentModalOpen && selectedLedger && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Receive Due Balance Payment</h3>
            <p className="text-[11px] text-slate-400 font-mono mb-4">Client Target: {selectedLedger.name}</p>
            
            <form onSubmit={handleLogManualPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Payment Date</label>
                  <input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Routing Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "cash" | "bank")} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
                    <option value="cash">Cash Account</option>
                    <option value="bank">Bank Wire Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Collected Capital Amount (PKR)</label>
                <input type="number" min="1" required value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Memo / Receipt Notes</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="e.g. Cleared partial recovery" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-3 py-2 border border-slate-200 text-slate-600 font-mono text-xs rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs rounded-xl transition-all shadow-xs">Post Payment Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Core Ledger Summary Directory Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 font-bold">Distribution Client Info</th>
                <th className="py-3 px-4 font-bold">Contact Channel</th>
                <th className="py-3 px-4 font-bold text-right">Cumulative Value</th>
                <th className="py-3 px-4 font-bold text-right">Outstanding Balance</th>
                <th className="py-3 px-4 font-bold text-center">Collection Action</th>
                <th className="py-3 px-5 font-bold text-center">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 font-mono text-slate-400">
                    No partner store ledgers initialized.
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((l) => {
                  const owesMoney = l.balance > 0;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-800">{l.name}</div>
                        {l.address && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {l.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {l.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {l.phone}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No contact logged</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        PKR {l.totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={owesMoney ? "text-amber-700" : "text-emerald-700"}>
                          PKR {l.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <div className="text-[9px] text-slate-400 font-normal font-sans mt-0.5">
                          {owesMoney ? "Debit balance owed" : "Account perfectly balanced"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenPaymentModal(l)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-[11px] font-mono font-bold rounded-lg hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-3xs"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          Log Receipt
                        </button>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button 
                          onClick={() => { if (window.confirm(`Permanently remove ${l.name} ledger history?`)) onDeleteLedger(l.id); }} 
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}