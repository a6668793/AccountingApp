import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Wallet,
  Trash2,
  X,
  Settings,
  Calendar,
  Home,
  PieChart,
  BarChart3,
  Camera,
  Heart,
  Star,
  Target,
  Bell,
  MessageCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Coffee,
  Utensils,
  Bus,
  ShoppingBag,
  Gamepad2,
  Home as HomeIcon,
  Stethoscope,
  Smartphone,
  List,
  User,
  Share,
  Image as ImageIcon,
  Plane,
  Gift,
  TrendingUp,
  Repeat,
  CalendarClock,
  Car,
  GraduationCap,
  Scissors,
  Beer,
  PawPrint,
  Clock,
  Globe,
  CreditCard,
  ChevronDown,
  Upload,
  Edit2,
  Key,
} from "lucide-react";

// ----------------------------------------------------------------
// Gemini API 設定與工具
// ----------------------------------------------------------------
// 系統會自動注入 API Key，若您有自己的 Key 可填入，若出現錯誤建議留空使用預設環境
const apiKey = "";

const callGeminiVision = async (base64Image, prompt, userKey) => {
  const keyToUse = userKey || apiKey;
  if (!keyToUse) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      console.warn("Gemini API returned no candidates");
      return {};
    }

    const text = data.candidates[0].content.parts[0].text;
    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    return {};
  }
};

const callGeminiText = async (prompt, userKey) => {
  const keyToUse = userKey || apiKey;
  if (!keyToUse) return "記帳是愛自己的第一步 ( ˘ ³˘)♥";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) return "記帳是愛自己的第一步 ( ˘ ³˘)♥";

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      return "記帳是愛自己的第一步 ( ˘ ³˘)♥";
    }
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Text API Error:", error);
    return "記帳是愛自己的第一步 ( ˘ ³˘)♥";
  }
};

// ----------------------------------------------------------------
// 主程式
// ----------------------------------------------------------------

const BookkeepingApp = () => {
  // --- 狀態管理 ---
  const [showSplash, setShowSplash] = useState(true);

  // API Key 管理
  const [userApiKey, setUserApiKey] = useState(
    () => localStorage.getItem("pocketo_api_key") || ""
  );

  // 帳戶管理 (Multi-Account)
  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem("pocketo_accounts");
      return saved ? JSON.parse(saved) : [{ id: "default", name: "日常錢包" }];
    } catch (e) {
      return [{ id: "default", name: "日常錢包" }];
    }
  });
  const [currentAccountId, setCurrentAccountId] = useState(
    () => localStorage.getItem("pocketo_current_account") || "default"
  );

  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("pocketo_data_v2");
      let data = saved ? JSON.parse(saved) : [];
      if (data.length > 0 && !data[0].accountId) {
        data = data.map((t) => ({ ...t, accountId: "default" }));
      }
      return data;
    } catch (e) {
      return [];
    }
  });

  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem("pocketo_goals");
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 1,
              name: "日本旅遊基金",
              target: 50000,
              current: 12000,
              type: "travel",
              image: null,
            },
            {
              id: 2,
              name: "買新包包",
              target: 80000,
              current: 45000,
              type: "item",
              image: null,
            },
          ];
    } catch (e) {
      return [];
    }
  });
  const [recurringItems, setRecurringItems] = useState(() => {
    try {
      const saved = localStorage.getItem("pocketo_recurring");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 預算管理 (改為多帳戶獨立預算)
  const [budgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem("pocketo_budgets");
      if (saved) return JSON.parse(saved);

      const oldBudget = localStorage.getItem("pocketo_budget");
      return { default: oldBudget ? Number(oldBudget) : 20000 };
    } catch (e) {
      return { default: 20000 };
    }
  });

  const [userName, setUserName] = useState(
    () => localStorage.getItem("pocketo_username") || "Connie"
  );

  // 自訂開場圖片
  const [splashLogo, setSplashLogo] = useState(
    () => localStorage.getItem("pocketo_splash_logo") || null
  );

  const [view, setView] = useState("home");
  const [isLoading, setIsLoading] = useState(false);
  const [dailyQuote, setDailyQuote] = useState("今天有記帳嗎？⸜(｡˃ ᵕ ˂ )⸝♡");
  const [showNotification, setShowNotification] = useState(true);
  const [motivationTag, setMotivationTag] = useState("努力存錢，買下夢想 ✨");

  // 新增交易表單狀態
  const [newTrans, setNewTrans] = useState({
    type: "expense",
    amount: "",
    category: "飲食",
    note: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
  });

  // Modal 狀態
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [newGoalData, setNewGoalData] = useState({
    name: "",
    target: "",
    type: "travel",
    image: null,
  });
  const [showAddRecurringModal, setShowAddRecurringModal] = useState(false);
  const [newRecurringData, setNewRecurringData] = useState({
    name: "",
    amount: "",
    type: "expense",
    category: "固定支出",
    day: 1,
  });
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccountData, setNewAccountData] = useState({ name: "" });

  // 編輯預算 Modal 狀態
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editBudgetValue, setEditBudgetValue] = useState("");

  // --- Helpers ---
  const currentAccount =
    accounts.find((a) => a.id === currentAccountId) || accounts[0];
  const currentSymbol = "$";
  const currentBudget = budgets[currentAccountId] || 0;

  // --- Refs ---
  const fileInputRef = useRef(null);
  const goalImageInputRef = useRef(null);
  const splashLogoInputRef = useRef(null);

  // --- Effect Hooks ---

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem("pocketo_data_v2", JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    localStorage.setItem("pocketo_goals", JSON.stringify(goals));
  }, [goals]);
  useEffect(() => {
    localStorage.setItem("pocketo_budgets", JSON.stringify(budgets));
  }, [budgets]);
  useEffect(() => {
    localStorage.setItem("pocketo_username", userName);
  }, [userName]);
  useEffect(() => {
    localStorage.setItem("pocketo_recurring", JSON.stringify(recurringItems));
  }, [recurringItems]);
  useEffect(() => {
    localStorage.setItem("pocketo_accounts", JSON.stringify(accounts));
  }, [accounts]);
  useEffect(() => {
    localStorage.setItem("pocketo_current_account", currentAccountId);
  }, [currentAccountId]);
  useEffect(() => {
    localStorage.setItem("pocketo_api_key", userApiKey);
  }, [userApiKey]);
  useEffect(() => {
    if (splashLogo) localStorage.setItem("pocketo_splash_logo", splashLogo);
    else localStorage.removeItem("pocketo_splash_logo");
  }, [splashLogo]);

  // Recurring Logic
  useEffect(() => {
    const checkRecurring = () => {
      const today = new Date();
      const currentMonthKey = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}`;
      let hasNewTransactions = false;
      const updatedRecurring = recurringItems.map((item) => {
        if (
          item.lastProcessedMonth !== currentMonthKey &&
          today.getDate() >= item.day
        ) {
          const transDate = `${today.getFullYear()}-${String(
            today.getMonth() + 1
          ).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
          setTransactions((prev) => [
            {
              id: Date.now() + Math.random(),
              accountId: currentAccountId,
              type: item.type,
              amount: Number(item.amount),
              category: item.category,
              note: `[固定] ${item.name}`,
              date: transDate,
              time: "09:00",
            },
            ...prev,
          ]);
          hasNewTransactions = true;
          return { ...item, lastProcessedMonth: currentMonthKey };
        }
        return item;
      });
      if (hasNewTransactions) setRecurringItems(updatedRecurring);
    };
    if (recurringItems.length > 0) checkRecurring();
  }, [recurringItems, currentAccountId]);

  // Daily Quote
  useEffect(() => {
    const motivationList = [
      "努力存錢，買下夢想 ✨",
      "積少成多，財富自由 💰",
      "堅持就是勝利 💪",
      "理性消費，快樂加倍 🧠",
      "小錢也能滾成大財富 📈",
      "每一塊錢都重要 🪙",
      "未來的你會感謝現在的你 ❤️",
      "今日省一筆，明日去旅行 ✈️",
      "記帳是變有錢的第一步 🚀",
    ];
    setMotivationTag(
      motivationList[Math.floor(Math.random() * motivationList.length)]
    );

    const fetchQuote = async () => {
      const today = new Date().toDateString();
      const savedQuote = localStorage.getItem("pocketo_quote");
      if (savedQuote && localStorage.getItem("pocketo_quote_date") === today) {
        setDailyQuote(savedQuote);
      } else {
        // Only fetch if we have a key, otherwise use default
        if (userApiKey) {
          const quote = await callGeminiText(
            "給我一句關於省錢、理財或記帳的可愛正能量短語，20字內。",
            userApiKey
          );
          if (quote) {
            setDailyQuote(quote);
            localStorage.setItem("pocketo_quote", quote);
            localStorage.setItem("pocketo_quote_date", today);
          }
        }
      }
    };
    fetchQuote();
  }, [userApiKey]);

  // --- Data Filtering ---
  const accountTrans = transactions.filter(
    (t) =>
      t.accountId === currentAccountId ||
      (!t.accountId && currentAccountId === "default")
  );
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const monthTrans = accountTrans.filter((t) =>
    t.date.startsWith(currentMonthStr)
  );
  const monthExpense = monthTrans
    .filter((t) => t.type === "expense")
    .reduce((a, c) => a + Number(c.amount), 0);
  const budgetLeft = currentBudget - monthExpense;
  const budgetAlert = currentBudget > 0 && budgetLeft < currentBudget * 0.2;

  // --- Config ---
  const categoryConfig = {
    飲食: {
      icon: <Utensils size={18} />,
      color: "bg-orange-100 text-orange-600",
    },
    飲品: { icon: <Coffee size={18} />, color: "bg-amber-100 text-amber-700" },
    交通: { icon: <Bus size={18} />, color: "bg-blue-100 text-blue-600" },
    開車: { icon: <Car size={18} />, color: "bg-slate-100 text-slate-600" },
    服飾: {
      icon: <ShoppingBag size={18} />,
      color: "bg-pink-100 text-pink-600",
    },
    美容: { icon: <Scissors size={18} />, color: "bg-rose-100 text-rose-500" },
    娛樂: {
      icon: <Gamepad2 size={18} />,
      color: "bg-purple-100 text-purple-600",
    },
    聚會: { icon: <Beer size={18} />, color: "bg-yellow-100 text-yellow-600" },
    居家: {
      icon: <HomeIcon size={18} />,
      color: "bg-green-100 text-green-600",
    },
    寵物: {
      icon: <PawPrint size={18} />,
      color: "bg-orange-50 text-orange-800",
    },
    醫療: { icon: <Stethoscope size={18} />, color: "bg-red-100 text-red-600" },
    學習: {
      icon: <GraduationCap size={18} />,
      color: "bg-indigo-100 text-indigo-600",
    },
    "3C": {
      icon: <Smartphone size={18} />,
      color: "bg-gray-100 text-gray-600",
    },
    其他: { icon: <Sparkles size={18} />, color: "bg-teal-100 text-teal-600" },
    薪資: {
      icon: <Wallet size={18} />,
      color: "bg-emerald-100 text-emerald-600",
    },
    獎金: { icon: <Star size={18} />, color: "bg-amber-100 text-amber-600" },
    投資: {
      icon: <BarChart3 size={18} />,
      color: "bg-indigo-100 text-indigo-600",
    },
    固定支出: {
      icon: <Repeat size={18} />,
      color: "bg-slate-100 text-slate-600",
    },
    固定收入: {
      icon: <Repeat size={18} />,
      color: "bg-emerald-100 text-emerald-600",
    },
  };

  const getCategories = (type) =>
    type === "expense"
      ? [
          "飲食",
          "飲品",
          "交通",
          "開車",
          "服飾",
          "美容",
          "娛樂",
          "聚會",
          "居家",
          "寵物",
          "醫療",
          "學習",
          "3C",
          "其他",
        ]
      : ["薪資", "獎金", "投資", "其他", "固定收入"];

  // --- Handlers ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!userApiKey) {
      alert(
        "請先在「設定」中輸入您的 Google Gemini API Key 才能使用 AI 辨識功能喔！"
      );
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const result = await callGeminiVision(
          reader.result.split(",")[1],
          `分析記帳單據，請回傳 JSON 格式：{"amount": 數字, "category": "類別", "note": "備註", "date": "YYYY-MM-DD"}`,
          userApiKey
        );

        if (result && (result.amount || result.category)) {
          setNewTrans((p) => ({
            ...p,
            amount: result.amount || p.amount,
            category: result.category || p.category,
            note: result.note || p.note,
            date: result.date || p.date,
          }));
          alert("✨ 掃描成功！");
        } else {
          alert("🤔 AI 似乎沒看懂這張圖，請手動輸入試試看！");
        }
      } catch (e) {
        console.error(e);
        alert("嗚嗚，連線發生問題 > <");
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTrans.amount) return;
    setTransactions([
      {
        id: Date.now(),
        accountId: currentAccountId,
        ...newTrans,
        amount: Number(newTrans.amount),
      },
      ...transactions,
    ]);
    setNewTrans({
      type: "expense",
      amount: "",
      category: "飲食",
      note: "",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
    });
    setView("home");
  };

  const handleDelete = (id) => {
    if (window.confirm("確定刪除？"))
      setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleAddGoal = () => {
    if (!newGoalData.name || !newGoalData.target) return;
    setGoals([
      ...goals,
      {
        id: Date.now(),
        name: newGoalData.name,
        target: Number(newGoalData.target),
        current: 0,
        type: newGoalData.type,
        image: newGoalData.image,
      },
    ]);
    setShowAddGoalModal(false);
    setNewGoalData({ name: "", target: "", type: "travel", image: null });
  };
  const handleDeleteGoal = (id) => {
    if (window.confirm("放棄夢想？"))
      setGoals(goals.filter((g) => g.id !== id));
  };

  const handleAddRecurring = () => {
    if (!newRecurringData.name || !newRecurringData.amount) return;
    setRecurringItems([
      ...recurringItems,
      { id: Date.now(), ...newRecurringData, lastProcessedMonth: "" },
    ]);
    setShowAddRecurringModal(false);
    setNewRecurringData({
      name: "",
      amount: "",
      type: "expense",
      category: "固定支出",
      day: 1,
    });
  };
  const handleDeleteRecurring = (id) => {
    if (window.confirm("刪除設定？"))
      setRecurringItems(recurringItems.filter((item) => item.id !== id));
  };

  const handleAddAccount = () => {
    if (!newAccountData.name) return;
    const newAccount = { id: Date.now().toString(), name: newAccountData.name };
    setAccounts([...accounts, newAccount]);
    setBudgets({ ...budgets, [newAccount.id]: 0 });
    setCurrentAccountId(newAccount.id);
    setShowAccountModal(false);
    setNewAccountData({ name: "" });
  };

  const handleDeleteAccount = (id) => {
    if (accounts.length <= 1) {
      alert("至少需要保留一個帳戶喔！");
      return;
    }
    if (
      window.confirm(
        "確定要刪除這個帳戶嗎？\n(注意：該帳戶的記帳資料仍會保留在歷史紀錄中)"
      )
    ) {
      const newAccounts = accounts.filter((acc) => acc.id !== id);
      setAccounts(newAccounts);
      if (currentAccountId === id) {
        setCurrentAccountId(newAccounts[0].id);
      }
      const newBudgets = { ...budgets };
      delete newBudgets[id];
      setBudgets(newBudgets);
    }
  };

  const handleUpdateBudget = () => {
    setBudgets({
      ...budgets,
      [currentAccountId]: Number(editBudgetValue),
    });
    setIsEditingBudget(false);
  };

  const handleGoalImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewGoalData((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSplashLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setSplashLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // --- Components ---

  const SplashScreen = () => (
    <div
      className={`fixed inset-0 z-[100] bg-[#FAFAF9] flex flex-col items-center justify-center transition-opacity duration-1000 ${
        showSplash ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative mb-8">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#D9F99D] border-r-[#2DD4BF] border-b-[#D9F99D] border-l-[#FDE047] animate-spin-slow shadow-[0_0_15px_rgba(45,212,191,0.3)]"></div>
          <div className="animate-shake-delay flex items-center justify-center w-full h-full">
            {splashLogo ? (
              <img
                src={splashLogo}
                alt="Logo"
                className="w-20 h-20 object-contain drop-shadow-md rounded-xl"
              />
            ) : (
              <div className="text-stone-700 relative">
                <svg
                  width="60"
                  height="60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                  <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                  <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                  <path
                    d="M15 12v4"
                    className="text-stone-400"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-1 -ml-1 text-lg font-serif font-bold text-stone-600">
                  $
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <div className="flex items-baseline gap-3 overflow-hidden">
          <h1
            className="text-3xl text-stone-700 animate-slide-up-fade tracking-[0.2em]"
            style={{
              fontFamily: '"Noto Sans TC", sans-serif',
              fontWeight: 300,
              animationDelay: "0.5s",
            }}
          >
            小口袋
          </h1>
          <h1
            className="text-3xl text-stone-600 animate-slide-up-fade tracking-widest"
            style={{
              fontFamily: '"Noto Sans TC", sans-serif',
              fontWeight: 400,
              animationDelay: "1s",
            }}
          >
            Pocketo
          </h1>
        </div>
      </div>
    </div>
  );

  const Navbar = () => (
    <nav className="fixed bottom-0 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-stone-100 px-6 py-3 flex justify-between items-center z-50 safe-area-pb">
      <button
        onClick={() => setView("home")}
        className={`flex flex-col items-center space-y-1 ${
          view === "home" ? "text-stone-800" : "text-stone-300"
        }`}
      >
        <HomeIcon size={24} strokeWidth={view === "home" ? 2.5 : 2} />
        <span className="text-[10px] font-bold">首頁</span>
      </button>
      <button
        onClick={() => setView("stats")}
        className={`flex flex-col items-center space-y-1 ${
          view === "stats" ? "text-stone-800" : "text-stone-300"
        }`}
      >
        <PieChart size={24} strokeWidth={view === "stats" ? 2.5 : 2} />
        <span className="text-[10px] font-bold">報表</span>
      </button>
      <div className="relative -top-6">
        <button
          onClick={() => setView("add")}
          className="bg-stone-800 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transform active:scale-95"
        >
          <Plus size={28} />
        </button>
      </div>
      <button
        onClick={() => setView("goals")}
        className={`flex flex-col items-center space-y-1 ${
          view === "goals" ? "text-stone-800" : "text-stone-300"
        }`}
      >
        <Target size={24} strokeWidth={view === "goals" ? 2.5 : 2} />
        <span className="text-[10px] font-bold">目標</span>
      </button>
      <button
        onClick={() => setView("settings")}
        className={`flex flex-col items-center space-y-1 ${
          view === "settings" ? "text-stone-800" : "text-stone-300"
        }`}
      >
        <Settings size={24} strokeWidth={view === "settings" ? 2.5 : 2} />
        <span className="text-[10px] font-bold">設定</span>
      </button>
    </nav>
  );

  const HomeView = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayAmt = accountTrans
      .filter((t) => t.date === todayStr && t.type === "expense")
      .reduce((a, c) => a + Number(c.amount), 0);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);
    const lastMonthAmt = transactions
      .filter(
        (t) =>
          t.accountId === currentAccountId &&
          t.date.startsWith(lastMonthStr) &&
          t.type === "expense"
      )
      .reduce((a, c) => a + Number(c.amount), 0);

    return (
      <div className="space-y-6 pb-24 animate-fade-in">
        <div className="flex justify-between items-start pt-2">
          <div className="flex-1">
            <div className="mb-3">
              <span className="inline-block px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-xs font-bold tracking-wider animate-bounce shadow-sm border border-stone-200">
                {motivationTag}
              </span>
            </div>

            <div className="relative inline-block group">
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-2 text-2xl font-serif font-bold text-stone-800 hover:opacity-70 transition-opacity"
              >
                {currentAccount.name}
                <ChevronDown size={20} className="text-stone-400" />
              </button>
            </div>

            <p className="text-[10px] text-stone-400 font-sans tracking-[0.2em] font-bold uppercase mt-1">
              {userName}
            </p>
          </div>

          {showNotification && (
            <div className="bg-white p-3 rounded-2xl rounded-tr-sm max-w-[140px] shadow-sm border border-stone-200 relative mt-2 flex-shrink-0">
              <button
                onClick={() => setShowNotification(false)}
                className="absolute -top-2 -right-2 bg-stone-100 text-stone-400 rounded-full p-1"
              >
                <X size={10} />
              </button>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                {dailyQuote}
              </p>
            </div>
          )}
        </div>

        <div className="bg-[#F5F2EB] rounded-3xl p-6 shadow-sm border border-[#EBE5D9] relative overflow-hidden group">
          {budgetAlert && (
            <div className="absolute top-12 right-4 animate-bounce bg-red-100 text-red-500 text-xs px-2 py-1 rounded-full shadow-sm">
              <Bell size={10} className="mr-1 inline" />
              預算告急
            </div>
          )}

          <button
            onClick={() => {
              setEditBudgetValue(currentBudget);
              setIsEditingBudget(true);
            }}
            className="absolute top-4 right-4 p-2 bg-white/50 rounded-full text-stone-400 hover:text-stone-800 hover:bg-white transition-all z-10"
          >
            <Edit2 size={16} />
          </button>

          <div className="text-stone-400 text-xs font-bold tracking-widest uppercase mb-1">
            Monthly Budget
          </div>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-3xl font-sans font-black tracking-tight text-stone-800">
              {currentSymbol} {budgetLeft.toLocaleString()}
            </span>
            <span className="text-sm text-stone-400 font-sans font-bold">
              / {currentBudget.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-white rounded-full overflow-hidden border border-white/50">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                budgetAlert ? "bg-red-400" : "bg-stone-800"
              }`}
              style={{
                width: `${
                  currentBudget > 0
                    ? Math.min(
                        ((currentBudget - budgetLeft) / currentBudget) * 100,
                        100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-stone-500 font-bold">
            <span>
              已支 {currentSymbol}{" "}
              {(currentBudget - budgetLeft).toLocaleString()}
            </span>
            <span>
              {currentBudget > 0
                ? ((budgetLeft / currentBudget) * 100).toFixed(0)
                : 0}
              % Left
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-800"></div>
              <span className="text-[10px] text-stone-400 font-bold uppercase">
                今日消費
              </span>
            </div>
            <div className="text-xl font-sans font-black text-stone-800 tracking-tight">
              {currentSymbol} {todayAmt.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-stone-300"></div>
              <span className="text-[10px] text-stone-400 font-bold uppercase">
                上月支出
              </span>
            </div>
            <div className="text-xl font-sans font-black text-stone-400 tracking-tight">
              {currentSymbol} {lastMonthAmt.toLocaleString()}
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="font-bold text-stone-700 text-lg flex items-center gap-2">
              <List size={18} /> 近期紀錄
            </h2>
            <button className="text-xs text-stone-400 font-bold">
              VIEW ALL
            </button>
          </div>
          <div className="space-y-3">
            {accountTrans.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="bg-white p-4 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 flex justify-between items-center group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      categoryConfig[t.category]?.color || "bg-gray-100"
                    }`}
                  >
                    {categoryConfig[t.category]?.icon || <Sparkles size={18} />}
                  </div>
                  <div>
                    <div className="font-bold text-stone-800 text-sm">
                      {t.category}
                    </div>
                    <div className="text-xs text-stone-400">
                      {t.date} {t.note && `• ${t.note}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-sans font-black text-lg ${
                      t.type === "income"
                        ? "text-emerald-600"
                        : "text-stone-800"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"} {currentSymbol} {t.amount}
                  </span>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-stone-300 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AddView = () => (
    <div className="h-full flex flex-col pt-2 animate-slide-up bg-stone-50">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setView("home")}
          className="p-2 bg-white rounded-full shadow-sm"
        >
          <X size={20} />
        </button>
        <h2 className="font-bold text-stone-800">
          記一筆 ({currentAccount.name})
        </h2>
        <div className="w-9"></div>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 flex-1 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="inline-flex bg-stone-100 p-1 rounded-xl mb-6">
            <button
              onClick={() => setNewTrans({ ...newTrans, type: "expense" })}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                newTrans.type === "expense"
                  ? "bg-white shadow-sm text-stone-800"
                  : "text-stone-400"
              }`}
            >
              支出
            </button>
            <button
              onClick={() => setNewTrans({ ...newTrans, type: "income" })}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                newTrans.type === "income"
                  ? "bg-white shadow-sm text-emerald-600"
                  : "text-stone-400"
              }`}
            >
              收入
            </button>
          </div>
          <div className="flex justify-center items-baseline gap-1">
            <span className="text-4xl text-stone-800 font-sans font-black">
              {currentSymbol}
            </span>
            <input
              type="number"
              placeholder="0"
              className="text-6xl font-sans font-black text-stone-800 bg-transparent focus:outline-none placeholder-stone-200 min-w-[2ch] max-w-[250px] text-center"
              value={newTrans.amount}
              onChange={(e) =>
                setNewTrans({ ...newTrans, amount: e.target.value })
              }
              autoFocus
            />
          </div>
        </div>
        <div className="flex gap-3 mb-6 bg-indigo-50 p-2 rounded-2xl items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-12 h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-indigo-600 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Camera size={20} />
            )}
          </button>
          <div
            className="flex-1 text-xs text-indigo-800 font-bold"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="block text-indigo-400 font-normal mb-0.5 text-[10px] uppercase tracking-wider">
              AI Scan
            </span>
            點擊拍照，自動辨識記帳！
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </div>
        <div className="mb-6">
          <label className="text-xs font-bold text-stone-400 mb-3 block tracking-wider uppercase">
            選擇類別
          </label>
          <div className="grid grid-cols-4 gap-3">
            {getCategories(newTrans.type).map((cat) => (
              <button
                key={cat}
                onClick={() => setNewTrans({ ...newTrans, category: cat })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  newTrans.category === cat
                    ? "border-stone-800 bg-stone-50 scale-105 shadow-sm"
                    : "border-transparent hover:bg-stone-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                    newTrans.category === cat
                      ? "bg-stone-800 text-white"
                      : categoryConfig[cat]?.color ||
                        "bg-gray-100 text-gray-500"
                  }`}
                >
                  {categoryConfig[cat]?.icon}
                </div>
                <span
                  className={`text-xs font-bold ${
                    newTrans.category === cat
                      ? "text-stone-800"
                      : "text-stone-400"
                  }`}
                >
                  {cat}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-400 mb-1 block">
                日期
              </label>
              <input
                type="date"
                className="w-full p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-sans font-bold"
                value={newTrans.date}
                onChange={(e) =>
                  setNewTrans({ ...newTrans, date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-400 mb-1 block">
                時間 (選填)
              </label>
              <div className="relative">
                <input
                  type="time"
                  className="w-full p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-sans font-bold"
                  value={newTrans.time}
                  onChange={(e) =>
                    setNewTrans({ ...newTrans, time: e.target.value })
                  }
                />
                <Clock
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-400 mb-1 block">
              備註
            </label>
            <input
              type="text"
              placeholder="寫點什麼..."
              className="w-full p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-bold"
              value={newTrans.note}
              onChange={(e) =>
                setNewTrans({ ...newTrans, note: e.target.value })
              }
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["☕ 拿鐵", "🍱 便當", "🚇 捷運", "🧋 手搖"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setNewTrans({ ...newTrans, note: item.split(" ")[1] })
                }
                className="flex-shrink-0 px-3 py-1 bg-stone-100 rounded-full text-xs text-stone-500 hover:bg-stone-200 font-bold"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-8 pt-4 border-t border-stone-100">
            <h3 className="text-xs font-bold text-stone-400 mb-3 block tracking-wider uppercase">
              今日已記帳
            </h3>
            <div className="space-y-2">
              {transactions.filter(
                (t) => t.date === new Date().toISOString().split("T")[0]
              ).length === 0 ? (
                <p className="text-xs text-stone-300 text-center py-2">
                  今天還沒有紀錄喔
                </p>
              ) : (
                transactions
                  .filter(
                    (t) => t.date === new Date().toISOString().split("T")[0]
                  )
                  .slice(0, 3)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between items-center p-3 bg-stone-50 rounded-xl group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                            categoryConfig[t.category]?.color || "bg-gray-100"
                          }`}
                        >
                          {categoryConfig[t.category]?.icon || (
                            <Sparkles size={14} />
                          )}
                        </div>
                        <div className="text-sm text-stone-700 font-bold">
                          {t.category}{" "}
                          <span className="text-stone-400 font-normal ml-1 text-xs">
                            {t.note}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-sans font-bold ${
                            t.type === "income"
                              ? "text-emerald-600"
                              : "text-stone-800"
                          }`}
                        >
                          {t.amount}
                        </span>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-stone-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleAdd}
          className="w-full py-4 bg-stone-800 text-white rounded-2xl font-bold text-lg shadow-lg mt-4"
        >
          確認儲存
        </button>
      </div>
    </div>
  );

  const StatsView = () => {
    const expenseTrans = accountTrans.filter((t) => t.type === "expense");
    const catTotal = {};
    expenseTrans.forEach((t) => {
      catTotal[t.category] = (catTotal[t.category] || 0) + t.amount;
    });
    const sortedCats = Object.entries(catTotal).sort((a, b) => b[1] - a[1]);
    const maxCat = sortedCats[0]?.[1] || 1;

    // 本日消費計算
    const todayDate = new Date().toISOString().split("T")[0];
    const todayExpense = expenseTrans
      .filter((t) => t.date === todayDate)
      .reduce((a, c) => a + c.amount, 0);
    const currentMonthExpense = expenseTrans.reduce((a, c) => a + c.amount, 0);

    const today = new Date();
    const daysInMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const amount = expenseTrans
        .filter((t) => t.date === dateStr)
        .reduce((a, c) => a + c.amount, 0);
      return { day, amount, dateStr };
    });
    const maxDaily = Math.max(...dailyData.map((d) => d.amount), 1);

    return (
      <div className="pb-24 animate-fade-in space-y-8">
        <h1 className="text-2xl font-serif font-bold text-stone-800 mt-2">
          Spending Report
        </h1>

        {/* 今日焦點卡片 (灰底) */}
        <div className="bg-stone-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-stone-400 mb-2">
              <Calendar size={14} />
              <span className="text-[10px] font-bold tracking-widest uppercase">
                Today's Spending
              </span>
            </div>
            <div className="text-4xl font-sans font-black mb-4">
              {currentSymbol} {todayExpense.toLocaleString()}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-stone-300 font-medium">
              <TrendingUp size={12} />
              <span>
                本月已累積 {currentSymbol}{" "}
                {currentMonthExpense.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-600 mb-6 flex items-center gap-2">
            <BarChart3 size={16} /> 本月消費趨勢
          </h3>
          <div className="flex items-end justify-between h-32 gap-1">
            {dailyData.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1 group relative"
              >
                {d.amount > 0 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {currentSymbol}
                    {d.amount}
                  </div>
                )}
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    d.amount > 0
                      ? "bg-stone-300 hover:bg-stone-800"
                      : "bg-stone-100"
                  }`}
                  style={{
                    height: `${(d.amount / maxDaily) * 100}%`,
                    minHeight: d.amount > 0 ? "4px" : "0",
                  }}
                ></div>
                {i % 5 === 0 && (
                  <span className="text-[9px] text-stone-300">{d.day}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-600 mb-6 flex items-center gap-2">
            <Calendar size={16} /> 消費日曆
          </h3>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div
                key={i}
                className="text-center text-xs text-stone-300 font-bold"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {dailyData.map((d) => (
              <div
                key={d.day}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center border ${
                  d.amount > 0
                    ? "border-stone-800 bg-stone-50"
                    : "border-transparent bg-stone-50/50"
                }`}
              >
                <span
                  className={`text-[10px] font-bold ${
                    d.amount > 0 ? "text-stone-800" : "text-stone-300"
                  }`}
                >
                  {d.day}
                </span>
                {d.amount > 0 && (
                  <span className="text-[8px] text-stone-500 font-sans tracking-tighter">
                    {d.amount > 999
                      ? `${(d.amount / 1000).toFixed(1)}k`
                      : d.amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <h3 className="text-sm font-bold text-stone-600 mb-6 flex items-center gap-2">
            <PieChart size={16} /> 分類排行
          </h3>
          <div className="space-y-4">
            {sortedCats.slice(0, 5).map(([cat, amount], index) => (
              <div key={cat} className="relative">
                <div className="flex justify-between text-xs mb-1 relative z-10">
                  <span className="text-stone-700 font-bold flex items-center gap-2">
                    <span className="w-4 h-4 bg-stone-100 rounded text-[9px] flex items-center justify-center text-stone-500 font-black">
                      {index + 1}
                    </span>
                    {cat}
                  </span>
                  <span className="text-stone-800 font-sans font-bold">
                    {currentSymbol} {amount.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      categoryConfig[cat]?.color
                        .split(" ")[0]
                        .replace("bg-", "bg-") || "bg-stone-800"
                    }`}
                    style={{ width: `${(amount / maxCat) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const AccountModal = () => (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 animate-slide-up">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-stone-800">切換 / 新增帳戶</h3>
          <button
            onClick={() => setShowAccountModal(false)}
            className="p-1 bg-stone-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentAccountId(acc.id);
                  setShowAccountModal(false);
                }}
                className={`flex-1 p-3 rounded-xl flex justify-between items-center border ${
                  currentAccountId === acc.id
                    ? "border-stone-800 bg-stone-50"
                    : "border-stone-100 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
                    $
                  </div>
                  <span className="font-bold text-stone-700">{acc.name}</span>
                </div>
                {currentAccountId === acc.id && (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => handleDeleteAccount(acc.id)}
                className="p-3 rounded-xl border border-stone-100 text-stone-300 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-stone-100 pt-4">
          <label className="text-xs font-bold text-stone-400 mb-2 block uppercase">
            新增帳戶
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="帳戶名稱"
              className="flex-1 p-2 bg-stone-50 rounded-lg text-sm font-bold outline-none"
              value={newAccountData.name}
              onChange={(e) =>
                setNewAccountData({ ...newAccountData, name: e.target.value })
              }
            />
          </div>
          <button
            onClick={handleAddAccount}
            className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold shadow-lg"
          >
            建立帳戶
          </button>
        </div>
      </div>
    </div>
  );

  const RecurringView = () => (
    <div className="pb-24 animate-fade-in space-y-6 relative">
      <div className="flex justify-between items-center mt-2">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">
            Recurring Items
          </h1>
          <p className="text-xs text-stone-400 font-bold tracking-wider uppercase mt-1">
            每月自動記帳
          </p>
        </div>
        <button
          onClick={() => setShowAddRecurringModal(true)}
          className="text-stone-800 hover:text-stone-500 bg-stone-100 p-2 rounded-full"
        >
          <Plus size={24} />
        </button>
      </div>
      <div className="grid gap-3">
        {recurringItems.length === 0 ? (
          <div className="text-center py-10 text-stone-400 text-sm">
            還沒有設定固定收支喔！
            <br />
            點擊右上方 + 新增
          </div>
        ) : (
          recurringItems.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${
                    item.type === "expense"
                      ? "bg-red-50 text-red-500"
                      : "bg-emerald-50 text-emerald-500"
                  }`}
                >
                  {item.day}
                  <span className="text-[10px] ml-0.5">日</span>
                </div>
                <div>
                  <div className="font-bold text-stone-800">{item.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    每月自動{item.type === "expense" ? "扣款" : "入帳"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-sans font-black text-lg ${
                    item.type === "expense"
                      ? "text-stone-800"
                      : "text-emerald-600"
                  }`}
                >
                  {item.type === "expense" ? "-" : "+"} {item.amount}
                </span>
                <button
                  onClick={() => handleDeleteRecurring(item.id)}
                  className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {showAddRecurringModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-800">新增固定收支</h3>
              <button
                onClick={() => setShowAddRecurringModal(false)}
                className="p-1 bg-stone-100 rounded-full text-stone-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex bg-stone-100 p-1 rounded-xl">
                <button
                  onClick={() =>
                    setNewRecurringData({
                      ...newRecurringData,
                      type: "expense",
                      category: "固定支出",
                    })
                  }
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    newRecurringData.type === "expense"
                      ? "bg-white text-stone-800 shadow-sm"
                      : "text-stone-400"
                  }`}
                >
                  固定支出
                </button>
                <button
                  onClick={() =>
                    setNewRecurringData({
                      ...newRecurringData,
                      type: "income",
                      category: "固定收入",
                    })
                  }
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    newRecurringData.type === "income"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-stone-400"
                  }`}
                >
                  固定收入
                </button>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 mb-1 block">
                  項目名稱
                </label>
                <input
                  type="text"
                  placeholder={
                    newRecurringData.type === "expense"
                      ? "例如：房租、Netflix"
                      : "例如：薪水"
                  }
                  className="w-full p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-bold"
                  value={newRecurringData.name}
                  onChange={(e) =>
                    setNewRecurringData({
                      ...newRecurringData,
                      name: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-400 mb-1 block">
                    金額
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full pl-7 p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-bold"
                      value={newRecurringData.amount}
                      onChange={(e) =>
                        setNewRecurringData({
                          ...newRecurringData,
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-400 mb-1 block">
                    每月執行日
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="1"
                      className="w-full p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-bold text-center"
                      value={newRecurringData.day}
                      onChange={(e) =>
                        setNewRecurringData({
                          ...newRecurringData,
                          day: Number(e.target.value),
                        })
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">
                      號
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleAddRecurring}
                className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold shadow-lg shadow-stone-200 hover:bg-stone-900 transition-colors"
              >
                設定完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const GoalsView = () => (
    <div className="pb-24 animate-fade-in space-y-6 relative">
      <div className="flex justify-between items-center mt-2">
        <h1 className="text-2xl font-serif font-bold text-stone-800">
          Savings Goals
        </h1>
        <button
          onClick={() => setShowAddGoalModal(true)}
          className="text-stone-800 hover:text-stone-500 bg-stone-100 p-2 rounded-full"
        >
          <Plus size={24} />
        </button>
      </div>
      <div className="grid gap-4">
        {goals.map((goal) => {
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          return (
            <div
              key={goal.id}
              className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden flex flex-col relative"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGoal(goal.id);
                }}
                className="absolute top-3 right-3 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full text-stone-400 hover:text-red-500 shadow-sm border border-stone-100 transition-colors"
              >
                <Trash2 size={14} />
              </button>
              {goal.image && (
                <div className="h-32 w-full bg-stone-200 relative">
                  <img
                    src={goal.image}
                    alt="Dream"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
              )}
              <div className="p-5 flex flex-col gap-4">
                <div
                  className={`flex justify-between items-start ${
                    !goal.image ? "pr-10" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-12 h-12 ${
                        goal.image
                          ? "bg-white/90 -mt-10 shadow-md relative z-10"
                          : "bg-[#FBF7F0]"
                      } rounded-2xl flex items-center justify-center text-2xl shadow-inner`}
                    >
                      {goal.type === "travel" ? "✈️" : "🎁"}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-700">{goal.name}</h3>
                      <p className="text-xs text-stone-400 mt-0.5 font-sans font-bold">
                        Target: ${goal.target.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-sans font-black text-lg text-stone-800">
                      ${goal.current.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-stone-400 mb-1 font-bold">
                    <span>{progress.toFixed(0)}%</span>
                    <span>
                      ${(goal.target - goal.current).toLocaleString()} to go
                    </span>
                  </div>
                  <div className="h-4 bg-stone-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-teal-200 to-teal-400 rounded-full shadow-sm transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <button className="w-full py-2 rounded-xl border border-stone-200 text-stone-500 text-xs font-bold hover:bg-stone-50 flex items-center justify-center gap-1">
                  <Plus size={12} /> 存入一筆
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {showAddGoalModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-800">建立新夢想</h3>
              <button
                onClick={() => setShowAddGoalModal(false)}
                className="p-1 bg-stone-100 rounded-full text-stone-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    setNewGoalData({ ...newGoalData, type: "item" })
                  }
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    newGoalData.type === "item"
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-stone-200 text-stone-400"
                  }`}
                >
                  <Gift size={24} />
                  <span className="text-xs font-bold">夢想物品</span>
                </button>
                <button
                  onClick={() =>
                    setNewGoalData({ ...newGoalData, type: "travel" })
                  }
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    newGoalData.type === "travel"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-stone-200 text-stone-400"
                  }`}
                >
                  <Plane size={24} />
                  <span className="text-xs font-bold">旅遊計畫</span>
                </button>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 mb-1 block">
                  目標名稱
                </label>
                <input
                  type="text"
                  placeholder="例如：馬爾地夫蜜月"
                  className="w-full p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-bold"
                  value={newGoalData.name}
                  onChange={(e) =>
                    setNewGoalData({ ...newGoalData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 mb-1 block">
                  目標金額
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full pl-7 p-3 bg-stone-50 rounded-xl text-stone-700 focus:outline-none font-bold"
                    value={newGoalData.target}
                    onChange={(e) =>
                      setNewGoalData({ ...newGoalData, target: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 mb-1 block">
                  夢想圖片 (選填)
                </label>
                <button
                  onClick={() => goalImageInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:bg-stone-50 transition-colors overflow-hidden relative"
                >
                  {newGoalData.image ? (
                    <img
                      src={newGoalData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon size={24} className="mb-2" />
                      <span className="text-xs">點擊上傳圖片</span>
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={goalImageInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleGoalImageUpload}
                />
              </div>
              <button
                onClick={handleAddGoal}
                className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold shadow-lg shadow-stone-200 hover:bg-stone-900 transition-colors"
              >
                開始存錢
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const SettingsView = () => (
    <div className="pb-24 animate-fade-in space-y-6">
      <h1 className="text-2xl font-serif font-bold text-stone-800 mt-2">
        Settings
      </h1>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <label className="text-xs font-bold text-stone-400 mb-2 block tracking-wider uppercase">
          Your Name
        </label>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center text-stone-400">
            <User size={20} />
          </div>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="flex-1 text-lg font-bold text-stone-800 border-b-2 border-transparent focus:border-stone-800 focus:outline-none bg-transparent transition-colors py-2"
            placeholder="輸入你的暱稱"
          />
        </div>
      </div>

      {/* API Key Input (Fixed) */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <label className="text-xs font-bold text-stone-400 mb-2 block tracking-wider uppercase">
          Google Gemini API Key
        </label>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <Key size={20} />
          </div>
          <input
            type="text"
            value={userApiKey}
            onChange={(e) => setUserApiKey(e.target.value)}
            className="flex-1 text-sm font-bold text-stone-600 border-b-2 border-transparent focus:border-indigo-500 focus:outline-none bg-transparent transition-colors py-2"
            placeholder="貼上你的 API Key"
          />
        </div>
        <p className="text-[10px] text-stone-400 mt-2">
          填入 Key 才能使用 AI 記帳與每日語錄喔！
        </p>
      </div>

      {/* Custom Splash Logo Upload */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <label className="text-xs font-bold text-stone-400 mb-4 block tracking-wider uppercase">
          自訂開場風格
        </label>
        <div className="flex gap-4 items-center">
          <div
            onClick={() => splashLogoInputRef.current?.click()}
            className="w-20 h-20 border-2 border-dashed border-stone-200 rounded-2xl flex items-center justify-center text-stone-400 hover:bg-stone-50 cursor-pointer overflow-hidden"
          >
            {splashLogo ? (
              <img
                src={splashLogo}
                alt="Splash"
                className="w-full h-full object-contain"
              />
            ) : (
              <Upload size={24} />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-stone-700 text-sm">
              上傳你的專屬圖片
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              將出現在 App 開場動畫中
            </p>
          </div>
          <input
            type="file"
            ref={splashLogoInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleSplashLogoUpload}
          />
        </div>
      </div>

      <div className="bg-white p-2 rounded-3xl shadow-sm border border-stone-100">
        <button
          onClick={() => setView("recurring")}
          className="w-full flex items-center justify-between p-4 hover:bg-stone-50 rounded-2xl transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-sm">
              <CalendarClock size={20} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-stone-700 text-sm">固定收支設定</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                房租、薪水自動記帳
              </p>
            </div>
          </div>
          <ChevronRight
            size={20}
            className="text-stone-300 group-hover:text-stone-500"
          />
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <label className="text-xs font-bold text-stone-400 mb-4 block tracking-wider uppercase">
          Share & Install
        </label>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 bg-stone-800 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <Share size={20} />
            </div>
            <div>
              <h3 className="font-bold text-stone-700 text-sm">
                如何讓朋友也使用？
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                只要將此網頁的網址傳給朋友，他們就能使用囉！
              </p>
            </div>
          </div>
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
            <h4 className="font-bold text-stone-800 text-xs mb-2">
              安裝到 iOS 桌面教學：
            </h4>
            <ol className="text-xs text-stone-500 space-y-2 list-decimal list-inside font-medium">
              <li>
                用 <strong>Safari</strong> 開啟此網頁
              </li>
              <li>
                點擊下方中間的 <strong>分享</strong> 按鈕
              </li>
              <li>
                往下滑，選擇 <strong>加入主畫面</strong>
              </li>
            </ol>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
        <label className="text-xs font-bold text-stone-400 mb-4 block tracking-wider uppercase">
          Data Management
        </label>
        <button
          onClick={() => {
            if (window.confirm("確定要清除所有資料嗎？此動作無法復原。")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full py-3 border border-red-100 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 size={16} /> 重置所有資料
        </button>
      </div>
      <div className="text-center text-xs text-stone-300 py-4">
        Pocketo v1.2.0 • Made with AI
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans text-stone-900 flex justify-center selection:bg-stone-200">
      <div className="w-full max-w-md bg-[#FAFAF9] min-h-screen relative flex flex-col shadow-2xl overflow-hidden">
        {showSplash && <SplashScreen />}

        <main className="flex-1 p-6 overflow-y-auto scrollbar-hide">
          {view === "home" && HomeView()}
          {view === "add" && AddView()}
          {view === "stats" && StatsView()}
          {view === "goals" && GoalsView()}
          {view === "settings" && SettingsView()}
          {view === "recurring" && RecurringView()}
        </main>

        {view !== "add" && Navbar()}

        {/* Account Modal fix applied here */}
        {showAccountModal && AccountModal()}

        {/* 預算編輯 Modal */}
        {isEditingBudget && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-slide-up space-y-4">
              <h3 className="text-lg font-bold text-stone-800 text-center">
                修改{currentAccount.name}預算
              </h3>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">
                  $
                </span>
                <input
                  type="number"
                  className="w-full pl-7 p-3 bg-stone-50 rounded-xl text-stone-800 font-bold focus:outline-none text-xl text-center"
                  value={editBudgetValue}
                  onChange={(e) => setEditBudgetValue(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="flex-1 py-3 text-stone-400 font-bold text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateBudget}
                  className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-bold shadow-lg"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-white/80 z-[70] flex flex-col items-center justify-center">
            <Sparkles className="animate-spin" />
            <p>AI Processing...</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        @keyframes slide-up-fade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up-fade { animation: slide-up-fade 1s ease-out forwards; opacity: 0; }
        @keyframes shake-delay { 0%, 80% { transform: rotate(0); } 85% { transform: rotate(-10deg); } 90% { transform: rotate(10deg); } 95% { transform: rotate(-5deg); } 100% { transform: rotate(0); } }
        .animate-shake-delay { animation: shake-delay 2.5s ease-in-out infinite; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default BookkeepingApp;
