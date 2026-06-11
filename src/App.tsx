import React, { useState, useEffect, useRef } from "react";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  Bot, 
  LayoutDashboard, 
  Package, 
  Users, 
  LogOut, 
  CloudCheck, 
  CloudOff, 
  Sparkles,
  DollarSign,
  TrendingUp,
  LogIn,
  History,
  Truck,
  Warehouse,
  FileSpreadsheet
} from "lucide-react";
import { 
  auth, 
  isConfigured, 
  syncProducts, 
  syncLedgers, 
  syncTransactions, 
  syncProcurements,
  writeProduct, 
  writeLedger, 
  writeTransaction, 
  writeProcurement,
  removeProduct, 
  removeLedger, 
  removeTransaction,
  removeProcurement,
  cloudConnectionError,
  cloudConnectionVerified
} from "./firebase";
import { Product, Ledger, Transaction, FactoryProcurement } from "./types";
import firebaseConfig from "../firebase-applet-config.json";

// Import custom sections
import Dashboard from "./components/Dashboard";
import InventoryManager from "./components/InventoryManager";
import LedgerManager from "./components/LedgerManager";
import Chatbot from "./components/Chatbot";
import SalesHistory from "./components/SalesHistory";
import ProcurementManager from "./components/ProcurementManager";
import GoogleSheetsManager from "./components/GoogleSheetsManager";

export default function App() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const seedingAttemptedRef = useRef(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return (window as any).__google_sheets_token || null;
  });

  // Real-time local data pools
  const [products, setProducts] = useState<Product[]>([]);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [procurements, setProcurements] = useState<FactoryProcurement[]>([]);

  // Tracking database loading states
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [ledgersLoaded, setLedgersLoaded] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [procurementsLoaded, setProcurementsLoaded] = useState(false);

  // Offline stats check to help recover offline ledger and inventory data
  const [localStats, setLocalStats] = useState<{
    productsCount: number;
    ledgersCount: number;
    transactionsCount: number;
    procurementsCount: number;
  }>({ productsCount: 0, ledgersCount: 0, transactionsCount: 0, procurementsCount: 0 });

  // Forms for Mock Account
  const [localName, setLocalName] = useState("");
  const [localEmail, setLocalEmail] = useState("");

  // Chromebook & Android PWA installer state checks
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsPwaInstalled(true);
    }
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallAppPWA = async () => {
    if (!deferredPrompt) {
      alert("📲 TURBO Ledger is already running in native optimized mode on your device!\n\nIf you want to pin this app on ChromeOS or Android:\n1. Click the browser's menu button (three dots)\n2. Select 'Install app' or 'Add to Home screen'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // Scan local directories/storage for data recovery indicators
  useEffect(() => {
    const checkLocalData = () => {
      try {
        const prod = JSON.parse(localStorage.getItem("inv_products") || "[]");
        const ledg = JSON.parse(localStorage.getItem("inv_ledgers") || "[]");
        const txs = JSON.parse(localStorage.getItem("inv_transactions") || "[]");
        const procr = JSON.parse(localStorage.getItem("inv_procurements") || "[]");

        setLocalStats({
          productsCount: Array.isArray(prod) ? prod.length : 0,
          ledgersCount: Array.isArray(ledg) ? ledg.length : 0,
          transactionsCount: Array.isArray(txs) ? txs.length : 0,
          procurementsCount: Array.isArray(procr) ? procr.length : 0
        });
      } catch (err) {
        console.error("Failed scanning local directories for data recovery", err);
      }
    };
    checkLocalData();

    window.addEventListener("storage", checkLocalData);
    return () => window.removeEventListener("storage", checkLocalData);
  }, []);

  // Safe migration and database synchronization routine
  const handleMigrateLocalData = async () => {
    if (!user) {
      alert("Please sign in or launch offline sandbox state to load this feature.");
      return;
    }
    
    try {
      const prod = JSON.parse(localStorage.getItem("inv_products") || "[]") as Product[];
      const ledg = JSON.parse(localStorage.getItem("inv_ledgers") || "[]") as Ledger[];
      const txs = JSON.parse(localStorage.getItem("inv_transactions") || "[]") as Transaction[];
      const procr = JSON.parse(localStorage.getItem("inv_procurements") || "[]") as FactoryProcurement[];

      if (prod.length === 0 && ledg.length === 0 && txs.length === 0 && procr.length === 0) {
        alert("No outstanding offline records detected in this browser session.");
        return;
      }

      let mP = 0, mL = 0, mT = 0, mPr = 0;

      for (const item of prod) {
        await writeProduct({ ...item, userId: user.uid }, user.uid);
        mP++;
      }
      for (const item of ledg) {
        await writeLetter({ ...item, userId: user.uid }, user.uid);
        mL++;
      }
      for (const item of txs) {
        await writeTransaction({ ...item, userId: user.uid }, user.uid);
        mT++;
      }
      for (const item of procr) {
        await writeProcurement({ ...item, userId: user.uid }, user.uid);
        mPr++;
      }

      const backupKey = `migrated_backup_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify({
        date: new Date().toISOString(),
        products: prod,
        ledgers: ledg,
        transactions: txs,
        procurements: procr
      }));

      localStorage.removeItem("inv_products");
      localStorage.removeItem("inv_ledgers");
      localStorage.removeItem("inv_transactions");
      localStorage.removeItem("inv_procurements");

      setLocalStats({ productsCount: 0, ledgersCount: 0, transactionsCount: 0, procurementsCount: 0 });
      alert(`🎉 Data recovery & cloud sync complete!\n\nSuccessfully migrated:\n- ${mP} Products\n- ${mL} Ledger storefronts\n- ${mT} Sales transactions\n- ${mPr} Factory batches\n\nYour books are now securely saved in Cloud Firestore under account: ${user.email}`);
    } catch (err: any) {
      alert("Error occurred during data migration: " + err.message);
    }
  };

  const handleRestoreFromBackup = async (backupFileContent: string) => {
    if (!user) {
      alert("Please authenticate or open local sandbox session to restore records.");
      return;
    }
    try {
      const raw = JSON.parse(backupFileContent);
      if (!raw || typeof raw !== "object") {
        throw new Error("Invalid schema or corrupt JSON file.");
      }

      let rP = 0, rL = 0, rT = 0, rPr = 0;

      if (Array.isArray(raw.products)) {
        for (const item of raw.products) {
          await writeProduct({ ...item, userId: user.uid }, user.uid);
          rP++;
        }
      }
      if (Array.isArray(raw.ledgers)) {
        for (const item of raw.ledgers) {
          await writeLedger({ ...item, userId: user.uid }, user.uid);
          rL++;
        }
      }
      if (Array.isArray(raw.transactions)) {
        for (const item of raw.transactions) {
          await writeTransaction({ ...item, userId: user.uid }, user.uid);
          rT++;
        }
      }
      if (Array.isArray(raw.procurements)) {
        for (const item of raw.procurements) {
          await writeProcurement({ ...item, userId: user.uid }, user.uid);
          rPr++;
        }
      }

      alert(`✅ Backup Restored Successfully!\n\nSuccessfully integrated:\n- ${rP} Products\n- ${rL} Ledger storefronts\n- ${rT} Historical transactions\n- ${rPr} Factory consignments\n\nCloud databases have refreshed with your restored ledger files.`);
    } catch (err: any) {
      alert("Restore error: " + err.message);
    }
  };

  // Firebase auth listener
  useEffect(() => {
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || "Merchant User",
          });
          seedingAttemptedRef.current = false;
        } else {
          const cached = localStorage.getItem("local_session_user");
          if (cached) {
            setUser(JSON.parse(cached));
            seedingAttemptedRef.current = false;
          } else {
            setUser(null);
            seedingAttemptedRef.current = false;
          }
        }
      });
      return unsubscribe;
    } else {
      const cached = localStorage.getItem("local_session_user");
      if (cached) {
        setUser(JSON.parse(cached));
      }
    }
  }, []);

  // Sync products, ledgers, and invoices
  useEffect(() => {
    if (!user) return;

    setProductsLoaded(false);
    setLedgersLoaded(false);
    setTransactionsLoaded(false);
    setProcurementsLoaded(false);

    const unsubProducts = syncProducts((data) => {
      setProducts(data);
      setProductsLoaded(true);
    }, user.uid);

    const unsubLedgers = syncLedgers((data) => {
      setLedgers(data);
      setLedgersLoaded(true);
    }, user.uid);

    const unsubTransactions = syncTransactions((data) => {
      setTransactions(data);
      setTransactionsLoaded(true);
    }, user.uid);

    const unsubProcurements = syncProcurements((data) => {
      setProcurements(data);
      setProcurementsLoaded(true);
    }, user.uid);

    return () => {
      unsubProducts();
      unsubLedgers();
      unsubTransactions();
      unsubProcurements();
    };
  }, [user]);

  // Seeder Engine with cleared stock and selling prices
  useEffect(() => {
    if (!user || !productsLoaded || !ledgersLoaded || !transactionsLoaded || !procurementsLoaded) return;
    if (localStorage.getItem("inv_fresh_slate_active") === "true") return;
    if (seedingAttemptedRef.current) return;
    seedingAttemptedRef.current = true;

    const seedHistoricData = async () => {
      try {
        const getNorm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const productGroups: { [normName: string]: Product[] } = {};
        for (const p of products) {
          const norm = getNorm(p.name);
          if (!productGroups[norm]) productGroups[norm] = [];
          productGroups[norm].push(p);
        }

        const canonicalIds = new Set([
          "prod_break_oil_200ml",
          "prod_break_oil_350ml",
          "prod_break_oil_500ml",
          "prod_turbo_coolant_anti_rust",
          "prod_turbo_coolant_anti_freeze_1l"
        ]);

        let productsListUpdated = [...products];

        for (const norm of Object.keys(productGroups)) {
          const group = productGroups[norm];
          if (group.length > 1) {
            let survivorIndex = group.findIndex(p => canonicalIds.has(p.id));
            let survivor = survivorIndex !== -1 ? group[survivorIndex] : group[0];
            const donors = group.filter(p => p.id !== survivor.id);
            
            for (const donor of donors) {
              const donorIsUserCreated = !canonicalIds.has(donor.id);
              const mergedProduct: Product = {
                ...survivor,
                name: donorIsUserCreated ? donor.name : survivor.name,
                sku: (donorIsUserCreated && donor.sku && !donor.sku.startsWith("OIL-BREAK")) ? donor.sku : survivor.sku,
                stock: donorIsUserCreated ? donor.stock : survivor.stock,
                category: donorIsUserCreated ? donor.category : survivor.category,
                sellingPrice: donorIsUserCreated && donor.sellingPrice > 0 ? donor.sellingPrice : survivor.sellingPrice,
                costPrice: donorIsUserCreated && donor.costPrice > 0 ? donor.costPrice : survivor.costPrice,
                wholesalePrice: donorIsUserCreated && donor.wholesalePrice > 0 ? donor.wholesalePrice : survivor.wholesalePrice,
                minStockAlert: donorIsUserCreated && donor.minStockAlert ? donor.minStockAlert : survivor.minStockAlert,
                updatedAt: new Date().toISOString()
              };
              
              await writeProduct(mergedProduct, user.uid);
              survivor = mergedProduct;
              productsListUpdated = productsListUpdated.map(p => p.id === survivor.id ? mergedProduct : p).filter(p => p.id !== donor.id);

              for (const tx of transactions) {
                if (tx.products && tx.products.some(item => item.productId === donor.id)) {
                  const updatedProductsRef = tx.products.map(item => item.productId === donor.id ? { ...item, productId: survivor.id } : item);
                  await writeTransaction({ ...tx, products: updatedProductsRef }, user.uid);
                }
              }

              for (const proc of procurements) {
                if (proc.items && proc.items.some(item => item.productId === donor.id)) {
                  const updatedItemsRef = proc.items.map(item => item.productId === donor.id ? { ...item, productId: survivor.id } : item);
                  await writeProcurement({ ...proc, items: updatedItemsRef }, user.uid);
                }
              }
              await removeProduct(donor.id, user.uid);
            }
          }
        }

        // Clean slate placeholders for manual data entries
        const productsToSeed = [
          {
            id: "prod_turbo_coolant_anti_rust",
            name: "Turbo Coolant Anti Rust",
            sku: "COOL-RUST-PREM",
            stock: 0,
            costPrice: 125,
            sellingPrice: 0,
            wholesalePrice: 170,
            category: "Coolants",
            minStockAlert: 10,
            updatedAt: "2026-06-07T12:00:00.000Z"
          },
          {
            id: "prod_turbo_coolant_anti_freeze_1l",
            name: "Turbo Coolant Anti Freeze 1L",
            sku: "COOL-FREEZE-1L",
            stock: 0,
            costPrice: 458.33,
            sellingPrice: 0,
            wholesalePrice: 540,
            category: "Coolants",
            minStockAlert: 5,
            updatedAt: "2026-06-07T12:00:00.000Z"
          },
          {
            id: "prod_break_oil_200ml",
            name: "Break oil 200 ML",
            sku: "OIL-BREAK-200",
            stock: 0,
            costPrice: 170.83,
            sellingPrice: 0,
            wholesalePrice: 210,
            category: "Lubricants",
            minStockAlert: 5,
            updatedAt: "2026-06-07T12:00:00.000Z"
          },
          {
            id: "prod_break_oil_350ml",
            name: "Break Oil 350MlL",
            sku: "OIL-BREAK-350",
            stock: 0,
            costPrice: 279.17,
            sellingPrice: 0,
            wholesalePrice: 330,
            category: "Lubricants",
            minStockAlert: 5,
            updatedAt: "2026-06-07T12:00:00.000Z"
          },
          {
            id: "prod_break_oil_500ml",
            name: "Break Oil 500ML",
            sku: "OIL-BREAK-500",
            stock: 0,
            costPrice: 375,
            sellingPrice: 0,
            wholesalePrice: 440,
            category: "Lubricants",
            minStockAlert: 5,
            updatedAt: "2026-06-07T12:00:00.000Z"
          }
        ];

        for (const pr of productsToSeed) {
          if (!currentProdIds.has(pr.id)) {
            await writeProduct({ ...pr, userId: user.uid }, user.uid);
          }
        }

        // Historic sub-ledger structures
        const currentProcIds = new Set(procurements.map(p => p.id));
        const procurementsToSeed: FactoryProcurement[] = [
          {
            id: "proc_1780908713030",
            date: "2026-06-07",
            totalExpectedPayment: 4833.32,
            amountPaidCash: 0,
            amountPaidBank: 0,
            totalPaid: 0,
            outstandingBalance: 4833.32,
            paymentStatus: "outstanding",
            notes: "Owed Fully",
            createdAt: "2026-06-07T09:15:00.000Z",
            userId: user.uid,
            items: [
              { productId: "prod_turbo_coolant_anti_rust", name: "Turbo Coolant Anti Rust", qty: 24, costPrice: 125, total: 3000 },
              { productId: "prod_turbo_coolant_anti_freeze_1l", name: "Turbo Coolant Anti Freeze 1L", qty: 4, costPrice: 458.33, total: 1833.32 }
            ]
          },
          {
            id: "proc_1780330346025",
            date: "2026-05-23",
            totalExpectedPayment: 16579.09,
            amountPaidCash: 0,
            amountPaidBank: 0,
            totalPaid: 0,
            outstandingBalance: 16579.09,
            paymentStatus: "outstanding",
            notes: "Owed Fully",
            createdAt: "2026-05-23T10:30:00.000Z",
            userId: user.uid,
            items: [
              { productId: "prod_break_oil_200ml", name: "Break oil 200 ML", qty: 4, costPrice: 170.83, total: 683.32 },
              { productId: "prod_break_oil_350ml", name: "Break Oil 350MlL", qty: 5, costPrice: 279.17, total: 1395.85 },
              { productId: "prod_break_oil_500ml", name: "Break Oil 500ML", qty: 4, costPrice: 375, total: 1500 },
              { productId: "prod_turbo_coolant_anti_rust", name: "Turbo Coolant Anti Rust", qty: 16, costPrice: 125, total: 2000 },
              { productId: "prod_turbo_coolant_anti_freeze_1l", name: "Turbo Coolant Anti Freeze 1L", qty: 24, costPrice: 458.33, total: 10999.92 }
            ]
          },
          {
            id: "proc_1780329377310",
            date: "2026-04-21",
            totalExpectedPayment: 10099.98,
            amountPaidCash: 0,
            amountPaidBank: 0,
            totalPaid: 0,
            outstandingBalance: 10099.98,
            paymentStatus: "outstanding",
            notes: "1st batch • Owed Fully",
            createdAt: "2026-04-21T11:45:00.000Z",
            userId: user.uid,
            items: [
              { productId: "prod_break_oil_200ml", name: "Break oil 200 ML", qty: 8, costPrice: 170.83, total: 1366.64 },
              { productId: "prod_break_oil_350ml", name: "Break Oil 350MlL", qty: 8, costPrice: 279.17, total: 2233.36 },
              { productId: "prod_break_oil_500ml", name: "Break Oil 500ML", qty: 8, stroke: 375, total: 3000 },
              { productId: "prod_turbo_coolant_anti_rust", name: "Turbo Coolant Anti Rust", qty: 6, costPrice: 125, total: 750 },
              { productId: "prod_turbo_coolant_anti_freeze_1l", name: "Turbo Coolant Anti Freeze 1L", qty: 6, costPrice: 458.33, total: 2749.98 }
            ]
          }
        ];

        for (const pr of procurementsToSeed) {
          if (!currentProcIds.has(pr.id)) await writeProcurement(pr, user.uid);
        }

        const currentLedgerIds = new Set(ledgers.map(l => l.id));
        if (!currentLedgerIds.has("ledger_mazhar_karachi_auto")) {
          await writeLedger({
            id: "ledger_mazhar_karachi_auto",
            name: "Mazhar Karachi Auto",
            phone: "+92 302 6792388",
            email: "mazhar.karachi@gmail.com",
            address: "Canal Garden",
            balance: 0,
            totalPurchases: 7449.94,
            updatedAt: "2026-06-07T12:00:00.000Z",
            userId: user.uid
          }, user.uid);
        }
        if (!currentLedgerIds.has("ledger_sohaib")) {
          await writeLedger({ id: "ledger_sohaib", name: "Sohaib", phone: "", email: "", address: "", balance: 0, totalPurchases: 0, updatedAt: "2026-06-07T12:00:00.000Z", userId: user.uid }, user.uid);
        }
        if (!currentLedgerIds.has("ledger_hanzla_arif")) {
          await writeLedger({ id: "ledger_hanzla_arif", name: "hanzla arif", phone: "", email: "", address: "", balance: 0, totalPurchases: 600, updatedAt: "2026-06-07T12:00:00.000Z", userId: user.uid }, user.uid);
        }
        if (!currentLedgerIds.has("ledger_papa_client")) {
          await writeLedger({ id: "ledger_papa_client", name: "papa client", phone: "0320-4885390", email: "", address: "", balance: 0, totalPurchases: 600, updatedAt: "2026-06-07T12:00:00.000Z", userId: user.uid }, user.uid);
        }

        const currentTxIds = new Set(transactions.map(t => t.id));
        const txsToSeed: Transaction[] = [
          {
            id: "tx_1779832003927",
            type: "sale",
            ledgerId: "ledger_mazhar_karachi_auto",
            ledgerName: "Mazhar Karachi Auto",
            totalAmount: 3000,
            amountPaid: 3000,
            dueAmount: 0,
            paymentMethod: "bank",
            date: "2026-05-27T12:00:00.000Z",
            notes: "02",
            userId: user.uid,
            products: [{ productId: "prod_turbo_coolant_anti_rust", name: "Turbo Coolant Anti Rust", qty: 12, price: 250, costPrice: 125, total: 3000 }]
          },
          {
            id: "tx_1779374612627",
            type: "sale",
            ledgerId: "ledger_mazhar_karachi_auto",
            ledgerName: "Mazhar Karachi Auto",
            totalAmount: 4949.94,
            amountPaid: 4949.94,
            dueAmount: 0,
            paymentMethod: "cash",
            date: "2026-05-21T12:00:00.000Z",
            notes: "retail sale",
            userId: user.uid,
            products: [
              { productId: "prod_break_oil_200ml", name: "Break oil 200 ML", qty: 2, price: 250, costPrice: 170.83, total: 500 },
              { productId: "prod_break_oil_350ml", name: "Break Oil 350MlL", qty: 3, price: 349.98, costPrice: 279.17, total: 1049.94 },
              { productId: "prod_break_oil_500ml", name: "Break Oil 500ML", qty: 2, price: 450, costPrice: 375, total: 900 },
              { productId: "prod_turbo_coolant_anti_rust", name: "Turbo Coolant Anti Rust", qty: 4, price: 300, costPrice: 125, total: 1200 },
              { productId: "prod_turbo_coolant_anti_freeze_1l", name: "Turbo Coolant Anti Freeze 1L", qty: 2, price: 650, costPrice: 458.33, total: 1300 }
            ]
          },
          {
            id: "tx_1779899317707",
            type: "sale",
            ledgerId: "ledger_sohaib",
            ledgerName: "Sohaib",
            totalAmount: 2352,
            amountPaid: 2352,
            dueAmount: 0,
            paymentMethod: "bank",
            date: "2026-05-27T12:00:00.000Z",
            notes: "Wholesale sales shipment",
            userId: user.uid,
            products: [{ productId: "prod_turbo_coolant_anti_freeze_1l", name: "Turbo Coolant Anti Freeze 1L", qty: 4, price: 588, costPrice: 458.33, total: 2352 }]
          }
        ];

        for (const t of txsToSeed) {
          if (!currentTxIds.has(t.id)) await writeTransaction(t, user.uid);
        }
      } catch (err) {
        console.error("Failed seeding historic procurements safely", err);
      }
    };

    const timer = setTimeout(() => { seedHistoricData(); }, 1500);
    return () => clearTimeout(timer);
  }, [user, products, procurements, ledgers, transactions, productsLoaded, ledgersLoaded, transactionsLoaded, procurementsLoaded]);

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName) return;
    const localUser = { uid: "local_merchant_default", email: localEmail || "demo@merchant.local", displayName: localName };
    localStorage.setItem("local_session_user", JSON.stringify(localUser));
    setUser(localUser);
    seedingAttemptedRef.current = false;
  };

  const handleLogout = async () => {
    if (isConfigured && auth) await signOut(auth).catch(() => {});
    localStorage.removeItem("local_session_user");
    setUser(null);
    seedingAttemptedRef.current = false;
  };

  const handleSaveProduct = async (p: Product) => { if (user) await writeProduct(p, user.uid); };
  const handleSaveLedger = async (l: Ledger) => { if (user) await writeLedger(l, user.uid); };
  const handleSaveTransaction = async (tx: Transaction) => { if (user) await writeTransaction(tx, user.uid); };
  const handleDeleteProduct = async (id: string) => { if (user) await removeProduct(id, user.uid); };
  const handleDeleteLedger = async (id: string) => { if (user) await removeLedger(id, user.uid); };
  const handleDeleteTransaction = async (id: string) => { if (user) await removeTransaction(id, user.uid); };
  const handleSaveProcurement = async (p: FactoryProcurement) => { if (user) await writeProcurement(p, user.uid); };
  const handleDeleteProcurement = async (id: string) => { if (user) await removeProcurement(id, user.uid); };

  const handleEraseAndResetAllData = async () => {
    if (!window.confirm("Format database logs?")) return;
    try {
      localStorage.setItem("inv_fresh_slate_active", "true");
      if (user && isConfigured && !user.uid.startsWith("local_")) {
        for (const p of products) await removeProduct(p.id, user.uid);
        for (const l of ledgers) await removeLedger(l.id, user.uid);
        for (const tx of transactions) await removeTransaction(tx.id, user.uid);
        for (const proc of procurements) await removeProcurement(proc.id, user.uid);
      }
      localStorage.removeItem("inv_products");
      localStorage.removeItem("inv_ledgers");
      localStorage.removeItem("inv_transactions");
      localStorage.removeItem("inv_procurements");
      setProducts([]); setLedgers([]); setTransactions([]); setProcurements([]);
      alert("Formatted system.");
    } catch (err: any) { alert(err.message); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" id="auth_view">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-red-650 shadow-xs">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Ledger & Inventory Bot</h1>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 border border-gray-100 shadow-md rounded-3xl sm:px-10 space-y-6">
            <form onSubmit={handleLocalLogin} className="space-y-4">
              <input type="text" required value={localName} onChange={(e) => setLocalName(e.target.value)} placeholder="Merchant Name" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm" />
              <input type="email" value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} placeholder="Email Address" className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm" />
              <button type="submit" className="w-full bg-red-650 text-white font-mono font-bold text-xs py-3 rounded-2xl">Launch Personal Ledger Engine</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900" id="main_app_view">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-slate-900 flex-col shrink-0 text-slate-300 p-6 space-y-4">
        <div className="text-white italic font-extrabold text-2xl tracking-widest font-mono text-center">TURBO</div>
        <nav className="flex flex-col gap-1">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm ${activeTab === "dashboard" ? "bg-white/10 text-white" : "text-slate-400"}`}>Dashboard</button>
          <button onClick={() => setActiveTab("inventory")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm ${activeTab === "inventory" ? "bg-white/10 text-white" : "text-slate-400"}`}>Inventory</button>
          <button onClick={() => setActiveTab("procurements")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm ${activeTab === "procurements" ? "bg-white/10 text-white" : "text-slate-400"}`}>Factory Procurements</button>
          <button onClick={() => setActiveTab("ledgers")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm ${activeTab === "ledgers" ? "bg-white/10 text-white" : "text-slate-400"}`}>Ledgers</button>
          <button onClick={() => setActiveTab("sales")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm ${activeTab === "sales" ? "bg-white/10 text-white" : "text-slate-400"}`}>Sales History</button>
          <button onClick={() => setActiveTab("chatbot")} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm ${activeTab === "chatbot" ? "bg-white/10 text-white" : "text-slate-400"}`}>AI Assistant</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-2 text-xs text-slate-400 hover:text-white"><LogOut className="w-4 h-4" /> Sign Out</button>
      </aside>

      {/* Content Panel Frame Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8">
          <h1 className="text-lg font-bold text-slate-800 capitalize">{activeTab} Overview</h1>
          <div className="text-right text-xs font-semibold text-slate-800">{user.displayName}</div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {activeTab === "dashboard" && <Dashboard products={products} ledgers={ledgers} transactions={transactions} procurements={procurements} onSelectTab={setActiveTab} onSaveProduct={handleSaveProduct} onDeleteTransaction={handleDeleteTransaction} onDeleteLedger={handleDeleteLedger} onSaveLedger={handleSaveLedger} localStats={localStats} onMigrateLocalData={handleMigrateLocalData} onRestoreFromBackup={handleRestoreFromBackup} googleToken={googleToken} setGoogleToken={setGoogleToken} productsLoaded={productsLoaded} ledgersLoaded={ledgersLoaded} transactionsLoaded={transactionsLoaded} procurementsLoaded={procurementsLoaded} onEraseAndResetAllData={handleEraseAndResetAllData} />}
          {activeTab === "inventory" && <InventoryManager products={products} onSaveProduct={handleSaveProduct} onDeleteProduct={handleDeleteProduct} />}
          {activeTab === "procurements" && <ProcurementManager products={products} procurements={procurements} onSaveProcurement={handleSaveProcurement} onDeleteProcurement={handleDeleteProcurement} onSaveProduct={handleSaveProduct} ledgers={ledgers} onSaveLedger={handleSaveLedger} onSaveTransaction={handleSaveTransaction} />}
          {activeTab === "ledgers" && <LedgerManager ledgers={ledgers} transactions={transactions} products={products} onSaveLedger={handleSaveLedger} onSaveTransaction={handleSaveTransaction} onDeleteLedger={handleDeleteLedger} onDeleteTransaction={handleDeleteTransaction} onSaveProduct={handleSaveProduct} />}
          {activeTab === "sales" && <SalesHistory transactions={transactions} products={products} ledgers={ledgers} onDeleteTransaction={handleDeleteTransaction} onSaveLedger={handleSaveLedger} onSaveProduct={handleSaveProduct} />}
          {activeTab === "chatbot" && <Chatbot products={products} ledgers={ledgers} transactions={transactions} onSaveProduct={handleSaveProduct} onSaveLedger={handleSaveLedger} onSaveTransaction={handleSaveTransaction} onSaveProcurement={handleSaveProcurement} />}
          {activeTab === "sheets_sync" && <GoogleSheetsManager products={products} ledgers={ledgers} transactions={transactions} procurements={procurements} onSaveProduct={handleSaveProduct} onSaveLedger={handleSaveLedger} onSaveTransaction={handleSaveTransaction} onSaveProcurement={handleSaveProcurement} googleToken={googleToken} setGoogleToken={setGoogleToken} />}
        </main>
      </div>
    </div>
  );
}