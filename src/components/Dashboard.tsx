import React, { useMemo } from "react";
import { 
  Package, 
  Users, 
  History, 
  Truck, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle,
  RefreshCw,
  Trash2
} from "lucide-react";
import { Product, Ledger, Transaction, FactoryProcurement } from "../types";

interface DashboardProps {
  products: Product[];
  ledgers: Ledger[];
  transactions: Transaction[];
  procurements: FactoryProcurement[];
  onSelectTab: (tab: string) => void;
  onSaveProduct: (p: Product) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
  onDeleteLedger: (id: string) => Promise<void>;
  onSaveLedger: (l: Ledger) => Promise<void>;
  localStats: {
    productsCount: number;
    ledgersCount: number;
    transactionsCount: number;
    procurementsCount: number;
  };
  onMigrateLocalData: () => Promise<void>;
  onRestoreFromBackup: (content: string) => Promise<void>;
  googleToken: string | null;
  setGoogleToken: (token: string | null) => void;
  productsLoaded: boolean;
  ledgersLoaded: boolean;
  transactionsLoaded: boolean;
  procurementsLoaded: boolean;
  onEraseAndResetAllData: () => Promise<void>;
}

export default function Dashboard({
  products,
  ledgers,
  transactions,
  procurements,
  onSelectTab,
  localStats,
  onMigrateLocalData,
  onEraseAndResetAllData
}: DashboardProps) {

  // Global Calculation Logic for Financial Aggregates
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalCostOfGoodsSold = 0;
    
    // Calculate totals from transaction history logs
    transactions.forEach(tx => {
      if (tx.type === "sale") {
        totalSales += tx.totalAmount;
        if (tx.products) {
          tx.products.forEach(item => {
            totalCostOfGoodsSold += (item.costPrice * item.qty);
          });
        }
      }
    });

    // Calculate Factory Outstanding Liabilities
    let totalFactoryOwed = 0;
    procurements.forEach(p => {
      totalFactoryOwed += p.outstandingBalance;
    });

    // Count stock items flagged as critical alerts
    const lowStockAlerts = products.filter(p => p.stock <= p.minStockAlert).length;

    return {
      totalSales,
      grossProfit: totalSales - totalCostOfGoodsSold,
      totalFactoryOwed,
      lowStockAlerts
    };
  }, [products, transactions, procurements]);

  return (
    <div className="space-y-6" id="dashboard_workspace">
      
      {/* Metrics Grid Panel Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl text-red-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Gross Turnover</p>
            <h3 className="text-xl font-bold text-slate-800">PKR {stats.totalSales.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Estimated Profit</p>
            <h3 className="text-xl font-bold text-slate-800">PKR {stats.grossProfit.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Factory Payables Owed</p>
            <h3 className="text-xl font-bold text-slate-800">PKR {stats.totalFactoryOwed.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
            <h3 className="text-xl font-bold text-slate-800">{stats.lowStockAlerts} Items</h3>
          </div>
        </div>

      </div>

      {/* Navigation Quick Shortcuts Grid Container */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button onClick={() => onSelectTab("inventory")} className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all space-y-2 cursor-pointer shadow-xs">
          <Package className="w-5 h-5 text-slate-600" />
          <p className="text-xs font-semibold text-slate-800">Manage Stock</p>
        </button>
        <button onClick={() => onSelectTab("procurements")} className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all space-y-2 cursor-pointer shadow-xs">
          <Truck className="w-5 h-5 text-amber-500" />
          <p className="text-xs font-semibold text-slate-800">Factory Logs</p>
        </button>
        <button onClick={() => onSelectTab("ledgers")} className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all space-y-2 cursor-pointer shadow-xs">
          <Users className="w-5 h-5 text-slate-600" />
          <p className="text-xs font-semibold text-slate-800">Client Ledgers</p>
        </button>
        <button onClick={() => onSelectTab("sales")} className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-left transition-all space-y-2 cursor-pointer shadow-xs">
          <History className="w-5 h-5 text-red-500" />
          <p className="text-xs font-semibold text-slate-800">Audit History</p>
        </button>
      </div>

      {/* Local Browser Sandbox Migration Panel Block */}
      {(localStats.productsCount > 0 || localStats.ledgersCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              Unsaved Local Records Found
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              We detected {localStats.productsCount} products and {localStats.ledgersCount} customer lists saved in this browser session's local storage. Move them to your permanent secure storage cloud ledger seamlessly.
            </p>
          </div>
          <button onClick={onMigrateLocalData} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer shrink-0">
            Migrate to Cloud Database
          </button>
        </div>
      )}

      {/* Advanced System Formatting and Reset Maintenance Registry */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800">System Maintenance & Purge Controls</h4>
          <p className="text-xs text-slate-400">Manage database wipe operations to clear placeholders or format records.</p>
        </div>
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Complete System Hard Format Reset
            </span>
            <p className="text-[11px] text-slate-400 max-w-xl">
              Permanently purges all active product files, wholesale transaction sheets, customer ledgers, and history logs. This creates an empty, fresh-slate system.
            </p>
          </div>
          <button onClick={onEraseAndResetAllData} className="px-3.5 py-2 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 font-mono text-[11px] font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs">
            <Trash2 className="w-3.5 h-3.5" />
            Format Logs
          </button>
        </div>
      </div>

    </div>
  );
}