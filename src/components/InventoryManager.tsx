import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  Package, 
  Layers 
} from "lucide-react";
import { Product } from "../types";

interface InventoryManagerProps {
  products: Product[];
  onSaveProduct: (p: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

export default function InventoryManager({
  products,
  onSaveProduct,
  onDeleteProduct
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Form Management States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [category, setCategory] = useState("Coolants");
  const [minStockAlert, setMinStockAlert] = useState(5);

  // Filter products by search bar input and category dropdown selection
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenCreateForm = () => {
    setEditingId(null);
    setName("");
    setSku("");
    setStock(0);
    setCostPrice(0);
    setSellingPrice(0);
    setWholesalePrice(0);
    setCategory("Coolants");
    setMinStockAlert(5);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku);
    setStock(p.stock);
    setCostPrice(p.costPrice);
    setSellingPrice(p.sellingPrice);
    setWholesalePrice(p.wholesalePrice);
    setCategory(p.category);
    setMinStockAlert(p.minStockAlert);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    const targetProduct: Product = {
      id: editingId || `prod_${Date.now()}`,
      name,
      sku,
      stock: Number(stock),
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      wholesalePrice: Number(wholesalePrice),
      category,
      minStockAlert: Number(minStockAlert),
      updatedAt: new Date().toISOString(),
      userId: "" // Handled down inside database save routine
    };

    await onSaveProduct(targetProduct);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6" id="inventory_workspace">
      
      {/* Search Filter Controls Bar Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <option value="All">All Categories</option>
            <option value="Coolants">Coolants</option>
            <option value="Lubricants">Lubricants</option>
          </select>
        </div>

        <button
          onClick={handleOpenCreateForm}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-red-650 hover:bg-red-750 text-white font-mono font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {/* Dynamic Item Form Entry Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              {editingId ? "Modify Product Specifications" : "Create New Product Listing"}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Product Display Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Turbo Coolant Anti Rust" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">SKU Identifier</label>
                  <input type="text" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. COOL-RUST-PREM" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Operational Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500">
                    <option value="Coolants">Coolants</option>
                    <option value="Lubricants">Lubricants</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-dashed border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Initial Physical Stock</label>
                  <input type="number" min="0" required value={stock} onChange={(e) => setStock(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Min Stock Alert Point</label>
                  <input type="number" min="0" required value={minStockAlert} onChange={(e) => setMinStockAlert(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-dashed border-slate-100 pt-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase">Factory Cost</label>
                  <input type="number" step="0.01" min="0" required value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase">Wholesale Price</label>
                  <input type="number" step="0.01" min="0" required value={wholesalePrice} onChange={(e) => setWholesalePrice(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-slate-500 uppercase">Retail Price</label>
                  <input type="number" step="0.01" min="0" required value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-3 py-2 border border-slate-200 text-slate-600 font-mono text-xs rounded-xl hover:bg-slate-50 transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-650 hover:bg-red-750 text-white font-mono font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Structured Ledger Data Inventory Matrix Layout */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5 font-bold">Product Specifications</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-center">In-Stock Status</th>
                <th className="py-3 px-4 font-bold text-right">Unit Cost</th>
                <th className="py-3 px-4 font-bold text-right">Wholesale Rate</th>
                <th className="py-3 px-4 font-bold text-right">Retail Rate</th>
                <th className="py-3 px-5 font-bold text-center">Modify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 font-mono text-slate-400">
                    No matching distribution products cataloged.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className={`font-mono font-bold text-sm ${isLowStock ? "text-amber-600" : "text-slate-800"}`}>
                            {p.stock}
                          </span>
                          {isLowStock && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-50 text-amber-700 text-[9px] rounded-sm font-semibold border border-amber-100">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Low
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">PKR {p.costPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700 font-medium">PKR {p.wholesalePrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800 font-semibold">PKR {p.sellingPrice.toFixed(2)}</td>
                      <td className="py-3 px-5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => handleOpenEditForm(p)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { if(window.confirm(`Delete ${p.name}?`)) onDeleteProduct(p.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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