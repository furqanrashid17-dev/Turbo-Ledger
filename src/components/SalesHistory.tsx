import React, { useState } from "react";
import { 
  History, 
  Calendar, 
  User, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FileText 
} from "lucide-react";
import { Transaction, Product, Ledger } from "../types";

interface SalesHistoryProps {
  transactions: Transaction[];
  products: Product[];
  ledgers: Ledger[];
  onDeleteTransaction: (id: string) => Promise<void>;
  onSaveLedger: (l: Ledger) => Promise<void>;
  onSaveProduct: (p: Product) => Promise<void>;
}

export default function SalesHistory({
  transactions,
  onDeleteTransaction
}: SalesHistoryProps) {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const toggleExpandRow = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  // Format timestamp strings into clean, readable date rows
  const formatTxDate = (isoString: string) => {
    try {
      const dateObj = new Date(isoString);
      return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6" id="sales_history_workspace">
      
      {/* Informative Header Row Block */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
        <h3 className="text-xs font-bold text-slate-800">Operational Audit Journal</h3>
        <p className="text-[11px] text-slate-400">Review sequential sales invoices, retail cash records, and manual ledger collections.</p>
      </div>

      {/* Primary History Transaction Registry Matrix Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 w-8"></th>
                <th className="py-3 px-4 font-bold">Transaction Reference</th>
                <th className="py-3 px-4 font-bold text-center">Type</th>
                <th className="py-3 px-4 font-bold text-right">Total Invoice</th>
                <th className="py-3 px-4 font-bold text-right">Paid Amount</th>
                <th className="py-3 px-4 font-bold text-center">Payment Channel</th>
                <th className="py-3 px-5 font-bold text-center">Purge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 font-mono text-slate-400">
                    No historic transaction journals discovered in books.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isExpanded = expandedTxId === tx.id;
                  const isSale = tx.type === "sale";
                  return (
                    <React.Fragment key={tx.id}>
                      <tr className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-3 text-center">
                          {isSale && tx.products && tx.products.length > 0 ? (
                            <button onClick={() => toggleExpandRow(tx.id)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          ) : (
                            <div className="w-6" />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {tx.ledgerName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            {formatTxDate(tx.date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            isSale 
                              ? "bg-red-50 text-red-700 border-red-100" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          }`}>
                            {isSale ? <ArrowUpRight className="w-3 h-3 text-red-500" /> : <ArrowDownLeft className="w-3 h-3 text-emerald-500" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600 font-medium">
                          PKR {tx.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                          PKR {tx.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center capitalize font-mono font-medium text-slate-500">
                          {tx.paymentMethod}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <button onClick={() => { if(window.confirm("Delete transaction entry? This will not re-adjust existing balances.")) onDeleteTransaction(tx.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-Table Itemization Details Row Tree */}
                      {isExpanded && isSale && tx.products && (
                        <tr className="bg-slate-50/60 border-y border-dashed border-slate-200">
                          <td colSpan={7} className="p-4 pl-12">
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-w-2xl shadow-2xs">
                              <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 text-[9px] font-mono uppercase text-slate-500 tracking-wider font-bold flex items-center gap-1">
                                <FileText className="w-3 h-3 text-slate-400" />
                                Distributed Items Invoice Breakdown
                              </div>
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="border-b border-slate-100 text-slate-400 font-mono">
                                    <th className="py-2 px-4">Item Specification</th>
                                    <th className="py-2 px-4 text-center">Qty Issued</th>
                                    <th className="py-2 px-4 text-right">Wholesale Rate</th>
                                    <th className="py-2 px-4 text-right">Row Net Total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                  {tx.products.map((item, i) => (
                                    <tr key={i}>
                                      <td className="py-2 px-4 text-slate-800 font-semibold">{item.name}</td>
                                      <td className="py-2 px-4 text-center font-mono">{item.qty} units</td>
                                      <td className="py-2 px-4 text-right font-mono">PKR {item.price.toFixed(2)}</td>
                                      <td className="py-2 px-4 text-right font-mono text-slate-900">PKR {item.total.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              
                              {/* Sub-Ledger Note and ID Reference Row */}
                              {tx.notes && (
                                <div className="bg-slate-50 border-t border-slate-100 p-3 text-[10px] text-slate-500 font-sans italic">
                                  <strong>Invoice Memo:</strong> {tx.notes}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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