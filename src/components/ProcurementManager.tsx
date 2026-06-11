import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Calendar, 
  FileText, 
  CreditCard, 
  AlertCircle, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  PlusCircle, 
  MinusCircle 
} from "lucide-react";
import { Product, FactoryProcurement, ProcurementItem, Ledger, Transaction } from "../types";

interface ProcurementManagerProps {
  products: Product[];
  procurements: FactoryProcurement[];
  onSaveProcurement: (p: FactoryProcurement) => Promise<void>;
  onDeleteProcurement: (id: string) => Promise<void>;
  onSaveProduct: (p: Product) => Promise<void>;
  ledgers: Ledger[];
  onSaveLedger: (l: Ledger) => Promise<void>;
  onSaveTransaction: (tx: Transaction) => Promise<void>;
}

export default function ProcurementManager({
  products,
  procurements,
  onSaveProcurement,
  onDeleteProcurement,
  onSaveProduct
}: ProcurementManagerProps) {
  // Modal Layout UI toggles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedProcurementId, setExpandedProcurementId] = useState<string | null>(null);

  // Form Management States
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [amountPaidCash, setAmountPaidCash] = useState(0);
  const [amountPaidBank, setAmountPaidBank] = useState(0);
  
  // Array holding dynamic rows of structural items added to the incoming batch
  const [formItems, setFormItems] = useState<{ productId: string; qty: number; costPrice: number }[]>([
    { productId: products[0]?.id || "", qty: 1, costPrice: products[0]?.costPrice || 0 }
  ]);

  // Global Calculation Engine to isolate Total Outstanding Factory Payables via useMemo hook
  const financialTotals = useMemo(() => {
    let grandProcurementCost = 0;
    let grandPaidCash = 0;
    let grandPaidBank = 0;
    let grandTotalPaid = 0;
    let grandOutstanding = 0;

    procurements.forEach(p => {
      grandProcurementCost += p.totalExpectedPayment;
      grandPaidCash += p.amountPaidCash;
      grandPaidBank += p.amountPaidBank;
      grandTotalPaid += p.totalPaid;
      grandOutstanding += p.outstandingBalance; // Aggregates liabilities across all history sheets
    });

    return {
      grandProcurementCost,
      grandPaidCash,
      grandPaidBank,
      grandTotalPaid,
      grandOutstanding
    };
  }, [procurements]);

  const toggleExpandRow = (id: string) => {
    setExpandedProcurementId(expandedProcurementId === id ? null : id);
  };

  const handleAddFormRow = () => {
    setFormItems([...formItems, { productId: products[0]?.id || "", qty: 1, costPrice: products[0]?.costPrice || 0 }]);
  };

  const handleRemoveFormRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleFormItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    if (field === "productId") {
      updated[index].productId = value;
      const matchingProd = products.find(p => p.id === value);
      if (matchingProd) {
        updated[index].costPrice = matchingProd.costPrice;
      }
    } else if (field === "qty") {
      updated[index].qty = Math.max(1, Number(value));
    } else if (field === "costPrice") {
      updated[index].costPrice = Math.max(0, Number(value));
    }
    setFormItems(updated);
  };

  // Compute live subtotal inside the form interface
  const formSubtotal = formItems.reduce((acc, row) => acc + (row.qty * row.costPrice), 0);

  const handleSubmitProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0 || formSubtotal <= 0) return;

    const formattedItems: ProcurementItem[] = formItems.map(row => {
      const prod = products.find(p => p.id === row.productId);
      return {
        productId: row.productId,
        name: prod ? prod.name : "Unknown Item",
        qty: row.qty,
        costPrice: row.costPrice,
        total: row.qty * row.costPrice
      };
    });

    const totalPaid = Number(amountPaidCash) + Number(amountPaidBank);
    const outstandingBalance = formSubtotal - totalPaid;
    
    let paymentStatus: "paid" | "partially_paid" | "outstanding" = "outstanding";
    if (outstandingBalance <= 0) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partially_paid";
    }

    const newProcurement: FactoryProcurement = {
      id: `proc_${Date.now()}`,
      date,
      totalExpectedPayment: formSubtotal,
      amountPaidCash: Number(amountPaidCash),
      amountPaidBank: Number(amountPaidBank),
      totalPaid,
      outstandingBalance,
      paymentStatus,
      notes,
      createdAt: new Date().toISOString(),
      userId: "",
      items: formattedItems
    };

    // Save batch record to database collections
    await onSaveProcurement(newProcurement);

    // Update product stock inventory counts inside physical warehouse arrays sequentially
    for (const item of formattedItems) {
      const match = products.find(p => p.id === item.productId);
      if (match) {
        await onSaveProduct({
          ...match,
          stock: match.stock + item.qty,
          costPrice: item.costPrice, // Automatically updates running base unit cost profile
          updatedAt: new Date().toISOString()
        });
      }
    }

    setIsModalOpen(false);
    // Reset form parameters
    setNotes("");
    setAmountPaidCash(0);
    setAmountPaidBank(0);
    setFormItems([{ productId: products[0]?.id || "", qty: 1, costPrice: products[0]?.costPrice || 0 }]);
  };

  return (
    <div className="space-y-6" id="procurement_workspace">
      
      {/* Financial Metrics Summary Subheaders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Gross Factory Purchases</span>
          <h4 className="text-lg font-bold text-slate-800 mt-1">PKR {financialTotals.grandProcurementCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Settled Vendor Capital</span>
          <h4 className="text-lg font-bold text-emerald-600 mt-1">PKR {financialTotals.grandTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs bg-amber-50/40 border-amber-100">
          <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider block">Total Liabilities Owed</span>
          <h4 className="text-lg font-bold text-amber-700 mt-1">PKR {financialTotals.grandOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
        </div>
      </div>

      {/* Primary Action Row Control Elements */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
        <div>
          <h3 className="text-xs font-bold text-slate-800">Inward Factory Supply Shipments</h3>
          <p className="text-[11px] text-slate-400">Track raw cost valuations, cash flow velocity, and solvency ratio sheets.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-red-650 hover:bg-red-750 text-white font-mono font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Log Incoming Batch
        </button>
      </div>

      {/* Dynamic Pop-Up Modal Setup for Adding New Procurements */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Log Incoming Factory Supply Bill</h3>
            
            <form onSubmit={handleSubmitProcurement} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Receiving Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Internal Batch Notes</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 1st Summer Consignment" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs" />
                </div>
              </div>

              {/* Dynamic Item Entry Section Matrix Grid */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wide">Itemization Details</span>
                  <button type="button" onClick={handleAddFormRow} className="text-xs font-mono font-bold text-red-650 hover:text-red-750 flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>

                <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <select value={item.productId} onChange={(e) => handleFormItemChange(idx, "productId", e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-xs">
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                      <input type="number" min="1" placeholder="Qty" value={item.qty} onChange={(e) => handleFormItemChange(idx, "qty", e.target.value)} className="w-16 bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-center" />
                      <input type="number" min="0" placeholder="Cost" value={item.costPrice} onChange={(e) => handleFormItemChange(idx, "costPrice", e.target.value)} className="w-24 bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-right" />
                      <button type="button" onClick={() => handleRemoveFormRow(idx)} className="text-slate-400 hover:text-red-600 p-1">
                        <MinusCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Settlement Cashflow Inputs */}
              <div className="grid grid-cols-2 gap-3 border-t border-dashed border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Paid Out via Cash (PKR)</label>
                  <input type="number" min="0" value={amountPaidCash} onChange={(e) => setAmountPaidCash(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Paid Out via Bank (PKR)</label>
                  <input type="number" min="0" value={amountPaidBank} onChange={(e) => setAmountPaidBank(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs" />
                </div>
              </div>

              {/* Dynamic Bottom Balance Ledger Breakdown */}
              <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl border border-slate-950 font-mono text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Cost Evaluation:</span>
                  <span>PKR {formSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Total Capital Settled:</span>
                  <span>PKR {(Number(amountPaidCash) + Number(amountPaidBank)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-500 font-bold border-t border-dashed border-slate-700 pt-1 mt-1 text-sm">
                  <span>Owed to Factory:</span>
                  <span>PKR {(formSubtotal - (Number(amountPaidCash) + Number(amountPaidBank))).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-2 border border-slate-200 text-slate-600 font-mono text-xs rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-650 hover:bg-red-750 text-white font-mono font-bold text-xs rounded-xl transition-all shadow-xs">Post Procurement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historic Logs Data Structure Matrix Tree */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 w-8"></th>
                <th className="py-3 px-4 font-bold">Consignment Reference</th>
                <th className="py-3 px-4 font-bold text-right">Raw Valuation</th>
                <th className="py-3 px-4 font-bold text-right">Settled Amount</th>
                <th className="py-3 px-4 font-bold text-right">Outstanding Bal</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-5 font-bold text-center">Purge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {procurements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 font-mono text-slate-400">
                    No factory structural procurement sheets recorded.
                  </td>
                </tr>
              ) : (
                procurements.map((p) => {
                  const isExpanded = expandedProcurementId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-3 text-center">
                          <button onClick={() => toggleExpandRow(p.id)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-all">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {p.date}
                          </div>
                          {p.notes && <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">{p.notes}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">PKR {p.totalExpectedPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 font-medium">PKR {p.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700 font-semibold">PKR {p.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            p.paymentStatus === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                            p.paymentStatus === "partially_paid" ? "bg-amber-50 text-amber-700 border-amber-100" :
                            "bg-red-50 text-red-700 border-red-100"
                          }`}>
                            {p.paymentStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-center">
                          <button onClick={() => { if(window.confirm("Purge historical record?")) onDeleteProcurement(p.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-Table Dropdown Tree Container */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60 border-y border-dashed border-slate-200">
                          <td colSpan={7} className="p-4 pl-12">
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-w-2xl shadow-2xs">
                              <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 text-[9px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                                Supply Itemization Ledger
                              </div>
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="border-b border-slate-100 text-slate-400 font-mono">
                                    <th className="py-2 px-4">Item Name</th>
                                    <th className="py-2 px-4 text-center">Inward Qty</th>
                                    <th className="py-2 px-4 text-right">Factory Cost</th>
                                    <th className="py-2 px-4 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                                  {p.items?.map((item, i) => (
                                    <tr key={i}>
                                      <td className="py-2 px-4 text-slate-800 font-semibold">{item.name}</td>
                                      <td className="py-2 px-4 text-center font-mono">{item.qty} units</td>
                                      <td className="py-2 px-4 text-right font-mono">PKR {item.costPrice.toFixed(2)}</td>
                                      <td className="py-2 px-4 text-right font-mono text-slate-900">PKR {item.total.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              
                              {/* Sub-ledger Cash Flow Breakdown Details */}
                              <div className="bg-slate-50 border-t border-slate-100 p-3 flex justify-between items-center text-[10px] font-mono text-slate-500">
                                <div className="flex gap-4">
                                  <span>Cash Settlements: <strong className="text-slate-700">PKR {p.amountPaidCash.toFixed(2)}</strong></span>
                                  <span>Bank Routing Settlements: <strong className="text-slate-700">PKR {p.amountPaidBank.toFixed(2)}</strong></span>
                                </div>
                                <span className="text-slate-400">Ref ID: {p.id}</span>
                              </div>
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