import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, MessageSquare } from "lucide-react";
import { Product, Ledger, Transaction } from "../types";

interface ChatbotProps {
  products: Product[];
  ledgers: Ledger[];
  transactions: Transaction[];
  onSaveProduct: (p: Product) => Promise<void>;
  onSaveLedger: (l: Ledger) => Promise<void>;
  onSaveTransaction: (tx: Transaction) => Promise<void>;
}

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
}

export default function Chatbot({
  products,
  ledgers,
  onSaveProduct,
  onSaveLedger,
  onSaveTransaction
}: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Salaam! I am your TURBO Ledger AI Agent. 🤖\n\nYou can chat with me normally to pull up stats or run entries.\n\nTry phrases like:\n• 'Add 10 stock to premium anti rust'\n• 'Log 5000 payment from Mazhar Karachi Auto'",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll conversational view to the newest entries
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input.toLowerCase();
    setInput("");

    // Simulate thinking delay step
    setTimeout(async () => {
      let responseText = "I processed your request, but couldn't map it to an exact action logic row. Could you phrase it slightly differently?";

      // --- NLP PARSING LOGIC LOOP 1: STOCK SETTING COMMANDS ---
      if (currentInput.includes("add") && currentInput.includes("stock")) {
        // Attempt extraction of numbers regex matching
        const matchNum = currentInput.match(/\d+/);
        if (matchNum) {
          const qtyToAdd = parseInt(matchNum[0]);
          // Find matching product line row
          let targetProd = products.find(p => currentInput.includes("rust") || currentInput.includes("coolant"));
          
          if (currentInput.includes("200")) targetProd = products.find(p => p.sku === "OIL-BREAK-200");
          else if (currentInput.includes("350")) targetProd = products.find(p => p.sku === "OIL-BREAK-350");
          else if (currentInput.includes("500")) targetProd = products.find(p => p.sku === "OIL-BREAK-500");

          if (targetProd) {
            const updatedProd = {
              ...targetProd,
              stock: targetProd.stock + qtyToAdd,
              updatedAt: new Date().toISOString()
            };
            await onSaveProduct(updatedProd);
            responseText = `✅ Operational Update: Added ${qtyToAdd} physical units to **${targetProd.name}**. Balance adjusted from ${targetProd.stock} to **${updatedProd.stock}** units inside physical warehouse registers.`;
          } else {
            responseText = `⚠️ Product reference could not be resolved. Please specify if it belongs to Brake Oil lines (200ml/350ml/500ml) or Anti Rust coolants explicitly.`;
          }
        }
      }

      // --- NLP PARSING LOGIC LOOP 2: RECEIPT COLLECTION VOUCHERS ---
      else if (currentInput.includes("log") || currentInput.includes("payment")) {
        const matchNum = currentInput.match(/\d+/);
        if (matchNum) {
          const collectedCash = parseInt(matchNum[0]);
          const targetLedger = ledgers.find(l => 
            currentInput.includes("mazhar") || 
            currentInput.includes("hanzla") || 
            currentInput.includes("papa") || 
            currentInput.includes("sohaib")
          );

          if (targetLedger) {
            // Generate a ledger payment voucher sheet sequence
            const newTx: Transaction = {
              id: `tx_bot_${Date.now()}`,
              type: "payment",
              ledgerId: targetLedger.id,
              ledgerName: targetLedger.name,
              totalAmount: 0,
              amountPaid: collectedCash,
              dueAmount: -collectedCash,
              paymentMethod: "cash",
              date: new Date().toISOString(),
              notes: "Logged automatically via AI Bot conversational dashboard",
              userId: ""
            };

            await onSaveTransaction(newTx);
            await onSaveLedger({
              ...targetLedger,
              balance: targetLedger.balance - collectedCash,
              updatedAt: new Date().toISOString()
            });

            responseText = `💸 **Payment Collected!** Posted PKR ${collectedCash.toLocaleString()} payment voucher to client: **${targetLedger.name}**. Client debit account balance decremented successfully.`;
          } else {
            responseText = `⚠️ Customer directory match failed. Ensure the client name exists inside active distribution sub-ledger registers before trying again.`;
          }
        }
      }

      // --- NLP PARSING LOGIC LOOP 3: INVENTORY METRICS LISTS ---
      else if (currentInput.includes("stock") || currentInput.includes("inventory") || currentInput.includes("list")) {
        const statusRows = products.map(p => `• ${p.name}: **${p.stock} units** (PKR ${p.wholesalePrice}/wholesale)`).join("\n");
        responseText = `📊 **Current Physical Warehouse Inventory Balance Rows:**\n\n${statusRows}`;
      }

      // --- NLP PARSING LOGIC LOOP 4: OUTSTANDING LIABILITIES ---
      else if (currentInput.includes("balance") || currentInput.includes("debt") || currentInput.includes("owe")) {
        const debtRows = ledgers.map(l => `• ${l.name}: **PKR ${l.balance.toLocaleString()}**`).join("\n");
        responseText = `📋 **Customer Debit Balances Ledger Summary:**\n\n${debtRows}`;
      }

      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        sender: "bot",
        text: responseText,
        timestamp: new Date()
      }]);

    }, 850);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl h-[calc(100vh-14rem)] flex flex-col shadow-3xs overflow-hidden" id="chatbot_workspace">
      
      {/* Bot Assistant Subheader Status Bar */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-650 rounded-xl flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">TURBO Agent Engine</h3>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              NLP Command Processing Pipeline Active
            </span>
          </div>
        </div>
      </div>

      {/* Message Output Thread Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          return (
            <div key={msg.id} className={`flex gap-3 max-w-xl ${isBot ? "mr-auto" : "ml-auto flex-row-reverse"}`}>
              <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold border ${
                isBot ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-900 text-slate-100 border-slate-950"
              }`}>
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap border ${
                isBot 
                  ? "bg-white text-slate-800 border-slate-200 shadow-3xs rounded-tl-none" 
                  : "bg-slate-900 text-slate-100 border-slate-950 rounded-tr-none"
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form Bar Panel Footer */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-2 items-center">
        <input
          type="text"
          placeholder="Type an entry order (e.g. 'Add 24 stock to anti freeze 1L')..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <button
          type="submit"
          className="bg-red-650 hover:bg-red-750 text-white p-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}