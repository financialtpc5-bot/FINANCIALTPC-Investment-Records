import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Activity, Edit2, X, Cloud, CloudOff, Globe, ExternalLink, Loader2, Clock, CheckCircle2, AlertCircle, Home, Wallet, Camera, FileUp, Merge, UploadCloud, ClipboardPaste, ListPlus, ImagePlus, FileImage, Wand2, Table2, Save, Trash, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, MessageSquareQuote, Calendar, PiggyBank, Layers, LayoutGrid, ChevronLeft, Instagram } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch } from 'firebase/firestore';

// --- Firebase Configuration ---
// ⚠️ 請將下方的設定替換為您從 Firebase 控制台取得的真實內容 ⚠️
// 1. 前往 Firebase Console -> Project Settings -> General -> SDK Setup and Configuration
// 2. 複製 const firebaseConfig = { ... } 裡面的內容貼到下方
const firebaseConfig = {
  apiKey: "AIzaSyD7QKNnfb9KhF8iPG7IofeuiY2mOpjCSYw",
  authDomain: "financialtpc-b6d38.firebaseapp.com",
  projectId: "financialtpc-b6d38",
  storageBucket: "financialtpc-b6d38.firebasestorage.app",
  messagingSenderId: "4897987034",
  appId: "1:4897987034:web:453588d84146c9b98d08e3"
};

// 如果您是在本地開發或發布到 GitHub Pages，請使用上面的設定
// 如果此程式碼在特定預覽環境運行，則會嘗試讀取環境變數 (可忽略下方這行)
const finalFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfig;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'stock-portfolio-v1';

// Initialize Firebase
const app = initializeApp(finalFirebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Constants & Dictionary ---
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16', '#06b6d4', '#d946ef'];
const CATEGORY_COLORS = {
    TW: '#8b5cf6', // Purple
    US: '#3b82f6', // Blue
    RealEstate: '#f97316', // Orange
    Cash: '#14b8a6' // Teal
};

const TW_STOCK_MAP = {
  '2330': '台積電', '2317': '鴻海', '2454': '聯發科', '2412': '中華電', '2308': '台達電',
  '2303': '聯電', '2881': '富邦金', '2882': '國泰金', '2886': '兆豐金', '2891': '中信金',
  '1216': '統一', '2002': '中鋼', '2912': '統一超', '2382': '廣達', '2357': '華碩',
  '2395': '研華', '2345': '智邦', '2207': '和泰車', '3711': '日月光投控', '2884': '玉山金',
  '2892': '第一金', '5880': '合庫金', '5871': '中租-KY', '2379': '瑞昱', '3008': '大立光',
  '2603': '長榮', '2609': '陽明', '2615': '萬海', '3034': '聯詠', '2327': '國巨',
  '2880': '華南金', '2885': '元大金', '3045': '台灣大', '4904': '遠傳', '2883': '開發金',
  '2890': '永豐金', '1101': '台泥', '1102': '亞泥', '2887': '台新金', '5876': '上海商銀',
  '3037': '欣興', '2301': '光寶科', '2408': '南亞科', '6415': '矽力*-KY', '5903': '全家',
  '2344': '華邦電', '3231': '緯創', '6669': '緯穎', '2409': '友達', '3481': '群創',
  '2356': '英業達', '2324': '仁寶', '4938': '和碩', '9910': '豐泰', '9904': '寶成',
  '0050': '元大台灣50', '0056': '元大高股息', '00878': '國泰永續高股息', '00929': '復華台灣科技優息',
  '00919': '群益台灣精選高息', '006208': '富邦台50', '00940': '元大台灣價值高息'
};

const US_STOCK_CN_MAP = {
  '特斯拉': 'TSLA', 'TESLA': 'TSLA',
  '蘋果': 'AAPL', 'APPLE': 'AAPL',
  '微軟': 'MSFT', 'MICROSOFT': 'MSFT',
  '輝達': 'NVDA', 'NVIDIA': 'NVDA',
  '亞馬遜': 'AMZN', 'AMAZON': 'AMZN',
  '谷歌': 'GOOG', 'GOOGLE': 'GOOG',
  '臉書': 'META', 'FACEBOOK': 'META', 'META': 'META',
  '台積電ADR': 'TSM', '台積電美股': 'TSM',
  '超微': 'AMD', '網飛': 'NFLX', '好市多': 'COST', '可口可樂': 'KO',
  '星巴克': 'SBUX', '波音': 'BA', '英特爾': 'INTC', '波克夏': 'BRK.B',
  '嬌生': 'JNJ', '摩根大通': 'JPM', '威士': 'V', 'VISA': 'V',
  'QQQ': 'QQQ', 'QLD': 'QLD', 'GRAB': 'GRAB', 'DJT': 'DJT', 'GEV': 'GEV', 'IBIT': 'IBIT'
};

const NAME_TO_SYMBOL_MAP = {};
Object.entries(TW_STOCK_MAP).forEach(([code, name]) => NAME_TO_SYMBOL_MAP[name] = code);
Object.entries(US_STOCK_CN_MAP).forEach(([name, code]) => NAME_TO_SYMBOL_MAP[name] = code);

// --- Helper Functions ---
const formatCurrency = (val) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(val);
const formatNumber = (val, decimals = 2) => new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);

// --- GEMINI API HELPER (TEXT) ---
const callGemini = async (prompt) => {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Gemini Call Failed:", error);
    return null;
  }
};

// --- GEMINI API HELPER (VISION) ---
const callGeminiVision = async (prompt, base64Image, mimeType = "image/png") => {
  const apiKey = ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  // Clean base64 string
  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  const payload = {
    contents: [{ 
        role: "user",
        parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: cleanBase64 } }
        ] 
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(`Gemini Vision API Error: ${response.statusText}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Gemini Vision Call Failed:", error);
    return null;
  }
};

// --- IMAGE UTILS (DIRECT) ---
const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

// --- COMPONENTS ---

const AiAnalysisRenderer = ({ content }) => {
    if (!content) return null;
    if (typeof content !== 'string') return <div className="text-red-400">分析資料格式錯誤</div>;

    const sections = [
        { key: 'allocation', icon: <Activity className="w-5 h-5 text-blue-400"/>, title: '資產配置體檢', color: 'bg-blue-500/10 border-blue-500/20' },
        { key: 'risk', icon: <AlertCircle className="w-5 h-5 text-yellow-400"/>, title: '風險預警', color: 'bg-yellow-500/10 border-yellow-500/20' },
        { key: 'advice', icon: <Sparkles className="w-5 h-5 text-green-400"/>, title: '投資建議', color: 'bg-green-500/10 border-green-500/20' },
        { key: 'fun', icon: <MessageSquareQuote className="w-5 h-5 text-purple-400"/>, title: '趣味人設點評', color: 'bg-purple-500/10 border-purple-500/20' },
    ];

    const extractSection = (text, markerIndex) => {
        const marker = `${markerIndex}.`;
        const nextMarker = `${markerIndex + 1}.`;
        const startIndex = text.indexOf(marker);
        if (startIndex === -1) return null;
        let endIndex = text.indexOf(nextMarker);
        if (endIndex === -1) endIndex = text.length;
        let sectionText = text.substring(startIndex, endIndex).trim();
        const firstLineBreak = sectionText.indexOf('\n');
        if (firstLineBreak !== -1) sectionText = sectionText.substring(firstLineBreak).trim();
        return sectionText;
    };

    return (
        <div className="space-y-4">
            {sections.map((section, idx) => {
                const text = extractSection(content, idx + 1);
                if (!text) return null;
                return (
                    <div key={section.key} className={`p-4 rounded-xl border ${section.color}`}>
                        <div className="flex items-center gap-2 mb-2 font-bold text-white text-lg border-b border-gray-700/50 pb-2">
                            {section.icon} {section.title}
                        </div>
                        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{text.replace(/\*\*/g, '')}</div>
                    </div>
                );
            })}
            {!content.includes('1.') && <div className="text-gray-300 whitespace-pre-wrap">{content}</div>}
        </div>
    );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(32.5);
  const [cash, setCash] = useState(0);
  const [realEstate, setRealEstate] = useState(0);
  const [realizedPL, setRealizedPL] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingAssets, setIsEditingAssets] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [importStep, setImportStep] = useState('input');
  const [importMode, setImportMode] = useState('text'); 
  const [ocrMarketType, setOcrMarketType] = useState('auto');
  const [textImportContent, setTextImportContent] = useState('');
  const [isAnalyzingPortfolio, setIsAnalyzingPortfolio] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [parsedItems, setParsedItems] = useState([]); 
  const [verifySortConfig, setVerifySortConfig] = useState({ key: null, direction: 'asc' });
  const [mainSortConfig, setMainSortConfig] = useState({ key: 'value', direction: 'desc' });
  const [chartMode, setChartMode] = useState('grouped'); 
  const [drillDownCategory, setDrillDownCategory] = useState(null); 
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [processedImgUrl, setProcessedImgUrl] = useState(null); 
  const [tempAssets, setTempAssets] = useState({ cash: 0, realEstate: 0, realizedPL: 0 });
  const [activeTab, setActiveTab] = useState('list');
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isFetchingName, setIsFetchingName] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [activeBatchCurrency, setActiveBatchCurrency] = useState(null); 
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [newStock, setNewStock] = useState({ symbol: '', name: '', type: 'TW', cost: '', quantity: '', currentPrice: '' });
  const [inputUnit, setInputUnit] = useState('shares');

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items'));
    const unsubscribePortfolio = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      setPortfolio(items);
      setIsLoading(false);
    });
    const settingsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.exchangeRate) setExchangeRate(data.exchangeRate);
        if (data.cash !== undefined) setCash(Number(data.cash));
        if (data.realEstate !== undefined) setRealEstate(Number(data.realEstate));
        if (data.realizedPL !== undefined) setRealizedPL(Number(data.realizedPL));
      }
    });
    return () => { unsubscribePortfolio(); unsubscribeSettings(); };
  }, [user]);

  useEffect(() => {
    if (user && portfolio.length > 0 && !lastUpdated) {
        setTimeout(() => handleUpdateAllPrices(true), 2000);
    }
    if (autoUpdateEnabled && user && portfolio.length > 0) {
      timerRef.current = setInterval(() => handleUpdateAllPrices(true), 60000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoUpdateEnabled, user, portfolio.length]);

  const calculateMarketValue = (stock) => {
    const price = (stock.currentPrice && stock.currentPrice > 0) ? stock.currentPrice : stock.cost;
    const value = price * stock.quantity;
    return stock.type === 'US' ? value * exchangeRate : value;
  };

  const calculateCostBasis = (stock) => {
    const cost = stock.cost * stock.quantity;
    return stock.type === 'US' ? cost * exchangeRate : cost;
  };

  const calculatePL = (stock) => calculateMarketValue(stock) - calculateCostBasis(stock);
  const calculatePLPercentage = (stock) => {
    const cost = calculateCostBasis(stock);
    return cost === 0 ? 0 : (calculatePL(stock) / cost) * 100;
  };

  const calculateDayChange = (stock) => {
    if (!stock.prevClose || stock.prevClose === 0) return { val: 0, percent: 0, total: 0 };
    const current = stock.currentPrice || stock.cost;
    const change = current - stock.prevClose;
    const changePercent = (change / stock.prevClose) * 100;
    let dayPL = change * stock.quantity;
    if (stock.type === 'US') dayPL = dayPL * exchangeRate;
    return { val: change, percent: changePercent, total: dayPL };
  };

  const totals = useMemo(() => {
    let stockAssetValue = 0;
    let stockCostValue = 0;
    let totalDayPL = 0; 
    portfolio.forEach(stock => {
      stockAssetValue += calculateMarketValue(stock);
      stockCostValue += calculateCostBasis(stock);
      totalDayPL += calculateDayChange(stock).total;
    });
    const totalStockPL = stockAssetValue - stockCostValue;
    const totalStockPLPercent = stockCostValue === 0 ? 0 : (totalStockPL / stockCostValue) * 100;
    const totalAssetValue = stockAssetValue + cash + realEstate;
    return { stockAssetValue, stockCostValue, totalStockPL, totalStockPLPercent, totalAssetValue, totalDayPL };
  }, [portfolio, exchangeRate, cash, realEstate]);

  const sortedPortfolio = useMemo(() => {
    let items = [...portfolio];
    if (mainSortConfig.key) {
      items.sort((a, b) => {
        let aVal = 0;
        let bVal = 0;
        switch (mainSortConfig.key) {
          case 'symbol': return mainSortConfig.direction === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
          case 'value': aVal = calculateMarketValue(a); bVal = calculateMarketValue(b); break;
          case 'pl': aVal = calculatePL(a); bVal = calculatePL(b); break;
          case 'dayPL': aVal = calculateDayChange(a).percent; bVal = calculateDayChange(b).percent; break;
          default: return 0;
        }
        if (aVal < bVal) return mainSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return mainSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [portfolio, mainSortConfig, exchangeRate]);

  const chartData = useMemo(() => {
    if (chartMode === 'grouped' && !drillDownCategory) {
        let twTotal = 0;
        let usTotal = 0;
        portfolio.forEach(stock => {
            const val = calculateMarketValue(stock);
            if (stock.type === 'TW') twTotal += val;
            else if (stock.type === 'US') usTotal += val;
        });
        const data = [];
        if (twTotal > 0) data.push({ name: '🇹🇼 台股', value: twTotal, type: 'category_TW', color: CATEGORY_COLORS.TW });
        if (usTotal > 0) data.push({ name: '🇺🇸 美股', value: usTotal, type: 'category_US', color: CATEGORY_COLORS.US });
        if (cash > 0) data.push({ name: '💰 現金', value: cash, type: 'cash', color: CATEGORY_COLORS.Cash });
        if (realEstate > 0) data.push({ name: '🏠 房地產', value: realEstate, type: 'realEstate', color: CATEGORY_COLORS.RealEstate });
        return data.sort((a, b) => b.value - a.value);
    }
    if (chartMode === 'grouped' && drillDownCategory) {
        const filtered = portfolio.filter(s => s.type === drillDownCategory);
        return filtered.map(stock => ({
            name: (stock.type === 'TW' ? '🇹🇼 ' : '🇺🇸 ') + (stock.name || stock.symbol),
            value: calculateMarketValue(stock),
            type: 'stock',
            symbol: stock.symbol
        })).sort((a, b) => b.value - a.value);
    }
    const data = portfolio.map(stock => ({
      name: (stock.type === 'TW' ? '🇹🇼 ' : '🇺🇸 ') + (stock.name || stock.symbol),
      value: calculateMarketValue(stock),
      type: 'stock',
      symbol: stock.symbol
    }));
    if (cash > 0) data.push({ name: '💰 現金', value: cash, type: 'cash', color: CATEGORY_COLORS.Cash });
    if (realEstate > 0) data.push({ name: '🏠 房地產', value: realEstate, type: 'realEstate', color: CATEGORY_COLORS.RealEstate });
    return data.sort((a, b) => b.value - a.value);
  }, [portfolio, exchangeRate, cash, realEstate, chartMode, drillDownCategory]);

  const handleChartClick = (data) => {
      if (chartMode === 'grouped' && !drillDownCategory) {
          if (data.type === 'category_TW') setDrillDownCategory('TW');
          else if (data.type === 'category_US') setDrillDownCategory('US');
      }
  };

  const handleMainSort = (key) => {
    let direction = 'desc'; 
    if (mainSortConfig.key === key && mainSortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setMainSortConfig({ key, direction });
  };

  const saveToFirestore = async (itemData, docId = null) => {
    if (!user) return;
    const id = docId || crypto.randomUUID();
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items', id), itemData);
  };

  const saveSettings = async (updates) => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), updates, { merge: true });
  };

  const handleSaveAssets = async () => {
    await saveSettings({ 
        cash: Number(tempAssets.cash), 
        realEstate: Number(tempAssets.realEstate),
        realizedPL: Number(tempAssets.realizedPL)
    });
    setIsEditingAssets(false);
  };

  const handleRemoveStock = async (id) => {
    if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items', id));
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!newStock.symbol) { alert('請輸入股票代號'); return; }
    if (!newStock.cost) { alert('請輸入平均成本'); return; }
    if (!newStock.quantity) { alert('請輸入持有股數'); return; }
    setUpdateStatus('處理中...');
    try {
        let symbolInput = newStock.symbol.trim();
        let symbolUpper = symbolInput.toUpperCase();
        if (US_STOCK_CN_MAP[symbolInput]) symbolUpper = US_STOCK_CN_MAP[symbolInput];
        else if (NAME_TO_SYMBOL_MAP[symbolInput]) symbolUpper = NAME_TO_SYMBOL_MAP[symbolInput];
        let type = newStock.type;
        if (/^[A-Z]+(\.[A-Z]+)?$/.test(symbolUpper)) type = 'US';
        else if (/^\d+$/.test(symbolUpper)) type = 'TW';
        let name = newStock.name || symbolUpper;
        if (type === 'TW' && TW_STOCK_MAP[symbolUpper]) {
            name = TW_STOCK_MAP[symbolUpper];
        }
        let finalQuantity = Number(newStock.quantity);
        if (type === 'TW' && inputUnit === 'sheets') {
            finalQuantity = finalQuantity * 1000;
        }
        const existingStock = portfolio.find(s => s.symbol === symbolUpper && s.type === type);
        if (existingStock) {
            const totalOldCost = existingStock.cost * existingStock.quantity;
            const totalNewCost = Number(newStock.cost) * finalQuantity;
            const totalQty = existingStock.quantity + finalQuantity;
            const avgCost = (totalOldCost + totalNewCost) / totalQty;
            const stockData = {
                ...existingStock,
                cost: Number(avgCost.toFixed(2)),
                quantity: totalQty
            };
            await saveToFirestore(stockData, existingStock.id);
            setUpdateStatus(`已合併持股：${symbolUpper}`);
        } else {
            const stockData = {
                symbol: symbolUpper,
                name: name,
                type: type,
                cost: Number(newStock.cost),
                quantity: finalQuantity,
                currentPrice: Number(newStock.currentPrice) || Number(newStock.cost),
                prevClose: Number(newStock.currentPrice) || Number(newStock.cost) 
            };
            await saveToFirestore(stockData);
            setUpdateStatus('新增成功');
        }
        setNewStock({ symbol: '', name: '', type: 'TW', cost: '', quantity: '', currentPrice: '' });
        setIsAdding(false);
        setTimeout(() => setUpdateStatus(''), 3000);
        handleUpdateAllPrices(false);
    } catch (e) {
        console.error(e);
        alert('新增失敗，請檢查網路連線');
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    const updatedData = { ...editingItem, cost: Number(editingItem.cost), quantity: Number(editingItem.quantity) };
    await saveToFirestore(updatedData, editingItem.id);
    setEditingItem(null);
  };

  const handleAiAnalysis = async () => {
    if (portfolio.length === 0) {
      alert("請先新增持股，AI 才能進行分析！");
      return;
    }
    setIsAnalyzingPortfolio(true);
    setShowAiModal(true);
    setAiAnalysisResult('');

    const summary = portfolio.map(s => `${s.symbol} (${s.name}): ${s.quantity}股, 成本${s.cost}, 市值${Math.round(calculateMarketValue(s))}`).join('; ');
    const totalVal = totals.totalAssetValue;
    const cashVal = cash;
    const prompt = `你是一位專業且帶點幽默感的財務顧問。請分析以下投資組合，並用繁體中文(台灣)給出建議：
    資產總值：${totalVal} TWD, 現金部位：${cashVal} TWD, 房產部位：${realEstate} TWD, 持股明細：${summary}, 已實現損益：${realizedPL} TWD
    請包含：1. 資產配置體檢 2. 風險預警 3. 投資建議 4. 趣味人設點評`;

    const result = await callGemini(prompt);
    setAiAnalysisResult(result || "抱歉，AI 暫時無法連線，請稍後再試。");
    setIsAnalyzingPortfolio(false);
  };

  const handleAiTextImport = async () => {
    if (!textImportContent.trim()) return;
    setUpdateStatus('AI 正在解析語意...');
    setIsAnalyzingImage(true);
    const prompt = `你是一個股票交易數據解析器。請從以下文字中提取股票交易資訊。
    使用者輸入文字： "${textImportContent}"
    請分析並回傳一個 JSON Array，格式： [{ "symbol": "2330", "name": "台積電", "type": "TW", "quantity": 1000, "cost": 950, "currency": "TWD" }]
    規則：辨識代號或中文名稱。若提到「張」，自動乘以 1000。若無成本設為 0。Type: TW/US. Currency: TWD/USD. 只回傳純 JSON。`;
    const result = await callGemini(prompt);
    setIsAnalyzingImage(false);
    if (result) {
      try {
        const match = result.match(/\[.*\]/s);
        const jsonStr = match ? match[0] : result.replace(/```json/g, '').replace(/```/g, '').trim();
        const items = JSON.parse(jsonStr);
        if (Array.isArray(items)) {
           const itemsWithId = items.map(item => ({ ...item, id: crypto.randomUUID(), currency: item.currency || (item.type === 'US' ? 'USD' : 'TWD') }));
           setParsedItems(itemsWithId);
           setImportStep('verify');
           setUpdateStatus('AI 解析完成，請確認資料');
        } else {
           throw new Error("Parsed result is not an array");
        }
      } catch (e) {
        console.error("AI Text Import Parse Error:", e);
        setUpdateStatus('AI 解析失敗，請確認格式或重試');
      }
    } else {
      setUpdateStatus('AI 連線失敗');
    }
  };

  const handleSetBatchCurrency = (currency) => {
    setActiveBatchCurrency(currency);
    setParsedItems(prev => prev.map(item => ({ ...item, currency })));
  };

  const handleImageUpload = async (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsAnalyzingImage(true);
      setOcrStatus('上傳圖片並啟動 AI 視覺辨識中...');
      setProcessedImgUrl(null);
      let allParsedItems = [];
      const totalFiles = files.length;
      let fakeProgress = 0;
      const progressInterval = setInterval(() => {
          setOcrProgress(prev => {
              if (prev >= 95) return prev;
              return prev + 5;
          });
      }, 300);

      for (let i = 0; i < totalFiles; i++) {
          setOcrStatus(`AI 正在分析第 ${i + 1} / ${totalFiles} 張圖片... (請稍候)`);
          try {
              const file = files[i];
              const base64 = await convertFileToBase64(file);
              if (i === 0) setProcessedImgUrl(base64);
              const mimeType = file.type || "image/png";
              let typeInstruction = "";
              if (ocrMarketType === 'tw') typeInstruction = "FOCUS ONLY on Taiwan Stocks (numeric codes).";
              if (ocrMarketType === 'us') typeInstruction = "FOCUS ONLY on US Stocks (letter codes).";

              const prompt = `
                Analyze this brokerage app screenshot (Taiwan or US/Firstrade layout). Extract stock positions into JSON.
                ${typeInstruction}
                RULES:
                1. TW Stocks (e.g. 2330): Unit "張" -> Qty*1000. "股" -> Keep. Cost often near "均價".
                2. US Stocks (e.g. TSLA): Qty often below symbol. Cost = "交易價格".
                OUTPUT: JSON Array only. [{"symbol": "GEV", "name": "GEV", "quantity": 11, "cost": 596.67, "type": "US", "currency": "USD"}]
                Currency: 'TWD' for TW, 'USD' for US usually.
              `;
              const result = await callGeminiVision(prompt, base64, mimeType);
              if (result) {
                  try {
                      const match = result.match(/\[.*\]/s);
                      const jsonStr = match ? match[0] : result.replace(/```json/g, '').replace(/```/g, '').trim();
                      const items = JSON.parse(jsonStr);
                      if (Array.isArray(items)) {
                          const validItems = items.map(item => ({
                              id: crypto.randomUUID(),
                              symbol: String(item.symbol || ''), 
                              name: String(item.name || item.symbol || 'Unknown'),
                              type: item.type || (/^\d+$/.test(item.symbol) ? 'TW' : 'US'),
                              quantity: Number(item.quantity) || 0,
                              cost: Number(Number(item.cost).toFixed(2)) || 0,
                              currentPrice: Number(item.currentPrice) || 0,
                              currency: item.currency || (item.type === 'US' ? 'USD' : 'TWD')
                          }));
                          allParsedItems = [...allParsedItems, ...validItems];
                      }
                  } catch (parseErr) { console.error("AI JSON Parse Error", parseErr); }
              }
          } catch (err) { console.error(err); }
      }
      clearInterval(progressInterval);
      setOcrProgress(100);
      setIsAnalyzingImage(false);
      if (allParsedItems.length > 0) {
          setParsedItems(allParsedItems);
          setImportStep('verify');
          // Default currency logic
          const usCount = allParsedItems.filter(i => i.type === 'US').length;
          // Fixed ReferenceError by using setActiveBatchCurrency
          setActiveBatchCurrency(usCount > allParsedItems.length / 2 ? 'USD' : 'TWD');
          setUpdateStatus(`辨識完成！共發現 ${allParsedItems.length} 檔標的`);
      } else {
          setUpdateStatus('未能辨識出有效資料，請確認圖片或手動輸入');
      }
  };

  const handleTextPaste = () => { handleAiTextImport(); };
  const handleVerifyChange = (id, field, value) => setParsedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  const handleVerifyDelete = (id) => setParsedItems(prev => prev.filter(item => item.id !== id));
  const handleVerifyAdd = () => setParsedItems(prev => [...prev, { id: crypto.randomUUID(), symbol: '', name: '', type: 'TW', quantity: 0, cost: 0, currency: 'TWD' }]);

  const handleVerifySort = (key) => {
    let direction = 'asc';
    if (verifySortConfig.key === key && verifySortConfig.direction === 'asc') direction = 'desc';
    setVerifySortConfig({ key, direction });
  };

  const sortedParsedItems = useMemo(() => {
    let sortableItems = [...parsedItems];
    if (verifySortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[verifySortConfig.key] < b[verifySortConfig.key]) return verifySortConfig.direction === 'asc' ? -1 : 1;
        if (a[verifySortConfig.key] > b[verifySortConfig.key]) return verifySortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [parsedItems, verifySortConfig]);

  const mergeAndImportData = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    const currentPortfolioMap = {};
    portfolio.forEach(item => {
        currentPortfolioMap[`${item.symbol}_${item.type}`] = { ...item, isNew: false };
    });
    let mergedCount = 0;
    let newCount = 0;
    const batchMap = {};

    for (const newItem of parsedItems) {
        if (!newItem.symbol || !newItem.quantity || !newItem.cost) continue;
        
        let type = newItem.type;
        if (/^[A-Z]+$/.test(newItem.symbol)) type = 'US';
        else if (/^\d+$/.test(newItem.symbol)) type = 'TW';
        const key = `${newItem.symbol}_${type}`;
        
        // Currency Conversion Logic
        let finalCost = Number(newItem.cost);
        if (type === 'US' && newItem.currency === 'TWD') {
            finalCost = finalCost / exchangeRate;
        }
        
        if (batchMap[key]) {
            const existing = batchMap[key];
            const totalOldCost = existing.cost * existing.quantity;
            const totalNewCost = finalCost * Number(newItem.quantity);
            const newTotalQty = existing.quantity + Number(newItem.quantity);
            const newAvgCost = (totalOldCost + totalNewCost) / newTotalQty;
            batchMap[key] = {
                ...existing,
                quantity: newTotalQty,
                cost: Number(newAvgCost.toFixed(2))
            };
        } else {
            batchMap[key] = { ...newItem, type, cost: finalCost }; 
        }
    }

    for (const key in batchMap) {
        const batchItem = batchMap[key];
        const existing = currentPortfolioMap[key]; 
        if (existing) {
            const totalOldCost = existing.cost * existing.quantity;
            const totalNewCost = Number(batchItem.cost) * Number(batchItem.quantity);
            const newTotalQty = existing.quantity + Number(batchItem.quantity);
            const newAvgCost = (totalOldCost + totalNewCost) / newTotalQty;
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items', existing.id);
            batch.update(ref, { cost: Number(newAvgCost.toFixed(2)), quantity: newTotalQty });
            mergedCount++;
        } else {
            const id = crypto.randomUUID();
            const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items', id);
            let name = batchItem.name || batchItem.symbol;
            if (batchItem.type === 'TW' && TW_STOCK_MAP[batchItem.symbol]) name = TW_STOCK_MAP[batchItem.symbol];
            batch.set(ref, {
                symbol: batchItem.symbol,
                name: name,
                type: batchItem.type,
                quantity: Number(batchItem.quantity),
                cost: Number(batchItem.cost),
                currentPrice: Number(batchItem.currentPrice || batchItem.cost),
                prevClose: Number(batchItem.cost) 
            });
            newCount++;
        }
    }
    try {
        await batch.commit();
        setUpdateStatus(`匯入成功：新增 ${newCount} 筆，更新 ${mergedCount} 筆`);
        setTimeout(() => handleUpdateAllPrices(false), 1000);
    } catch (e) { setUpdateStatus('匯入失敗'); }
    setIsImporting(false);
    setImportStep('input');
    setParsedItems([]);
    setTextImportContent('');
  };

  const fetchYahooData = async (ticker) => {
    const proxies = [
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    ];
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;

    for (let i = 0; i < proxies.length; i++) {
        try {
            const proxyUrl = proxies[i](targetUrl) + `&_=${Date.now()}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) continue;
            const data = await response.json();
            const jsonBody = data.contents ? JSON.parse(data.contents) : data;
            const result = jsonBody.chart?.result?.[0];
            if (result && result.meta) {
                return { 
                    price: result.meta.regularMarketPrice,
                    prevClose: result.meta.chartPreviousClose || result.meta.previousClose
                };
            }
        } catch (e) { }
    }
    return null;
  };

  const handleUpdateAllPrices = useCallback(async (silent = false) => {
    if (!silent) setIsUpdating(true);
    if (!silent) setUpdateStatus('連線中...');
    try {
      const rateData = await fetchYahooData('TWD=X');
      let currentRate = exchangeRate;
      if (rateData && rateData.price) {
        currentRate = rateData.price;
        await saveSettings({ exchangeRate: currentRate });
      }
      const updates = portfolio.map(async (stock) => {
        let apiTicker = stock.symbol;
        if (stock.type === 'TW') {
             if (/^\d+$/.test(stock.symbol)) apiTicker = `${stock.symbol}.TW`;
             else if (!stock.symbol.includes('.')) apiTicker = `${stock.symbol}.TW`;
        }
        const data = await fetchYahooData(apiTicker);
        if (data && data.price) {
          return saveToFirestore({ 
              ...stock, 
              currentPrice: data.price,
              prevClose: data.prevClose || stock.prevClose 
          }, stock.id);
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      setLastUpdated(new Date());
      if (!silent) {
         setUpdateStatus(`更新完成 (匯率 ${currentRate.toFixed(2)})`);
         setTimeout(() => setUpdateStatus(''), 3000);
      }
    } catch (error) {
      if (!silent) setUpdateStatus('更新失敗 (請檢查網路)');
    } finally {
      if (!silent) setIsUpdating(false);
    }
  }, [portfolio, exchangeRate]);

  const handleSymbolBlur = async () => {
    if (!newStock.symbol) return;
    setIsFetchingName(true);
    let inputRaw = newStock.symbol.trim();
    let symbol = inputRaw.toUpperCase();
    let type = newStock.type;
    let resolvedName = '';
    if (US_STOCK_CN_MAP[inputRaw] || US_STOCK_CN_MAP[symbol]) {
        symbol = US_STOCK_CN_MAP[inputRaw] || US_STOCK_CN_MAP[symbol]; type = 'US'; resolvedName = inputRaw; 
    } else if (NAME_TO_SYMBOL_MAP[inputRaw]) {
        symbol = NAME_TO_SYMBOL_MAP[inputRaw]; type = 'TW'; resolvedName = inputRaw;
    }
    if (/^[A-Z]+(\.[A-Z]+)?$/.test(symbol)) type = 'US';
    else if (/^\d+$/.test(symbol)) type = 'TW';
    if (type === 'TW' && TW_STOCK_MAP[symbol]) {
        resolvedName = TW_STOCK_MAP[symbol];
    }
    let apiTicker = symbol;
    if (type === 'TW' && /^\d+$/.test(symbol)) apiTicker = `${symbol}.TW`;
    const data = await fetchYahooData(apiTicker);
    setNewStock(prev => ({
        ...prev, type, symbol, name: resolvedName || prev.name,
        currentPrice: data ? data.price : prev.currentPrice, prevClose: data ? data.prevClose : prev.currentPrice 
    }));
    if (type === 'TW') setInputUnit('shares'); 
    else setInputUnit('shares');
    setIsFetchingName(false);
  };

  const openExternalLink = (stock) => {
    const url = stock.type === 'TW' ? `https://tw.stock.yahoo.com/quote/${stock.symbol.replace('.TW', '')}` : `https://finance.yahoo.com/quote/${stock.symbol}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-blue-500/30 pb-20 relative">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-400 w-6 h-6" />
            <h1 className="text-xl font-bold tracking-wide hidden md:block">MyPortfolio</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleAiAnalysis} className="hidden md:flex items-center gap-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-lg shadow-purple-900/30 border border-purple-400/30">
              <Sparkles className="w-3 h-3" /> AI 診斷
            </button>
            <div className="flex items-center bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600/50">
              <span className="text-gray-400 mr-2 text-xs md:text-sm">USD</span>
              <span className="font-mono font-bold text-green-400">{exchangeRate.toFixed(2)}</span>
            </div>
            {user ? <div className="hidden md:flex items-center text-blue-400 text-xs gap-1"><Cloud className="w-3 h-3"/> 已備份</div> : <div className="hidden md:flex items-center text-gray-500 text-xs gap-1"><CloudOff className="w-3 h-3"/> 離線</div>}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-gray-800 to-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-32 h-32 text-white" />
            </div>
            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">總資產價值 (TWD)</p>
            <p className="text-4xl font-bold mt-1 text-white tracking-tight">{formatCurrency(totals.totalAssetValue)}</p>
            <div className="flex gap-4 mt-4 text-xs text-gray-400">
               <div className="flex items-center gap-1"><Activity className="w-3 h-3 text-blue-400"/> 股票 {formatCurrency(totals.stockAssetValue)}</div>
               <div className="flex items-center gap-1"><Wallet className="w-3 h-3 text-teal-400"/> 現金 {formatCurrency(cash)}</div>
               <div className="flex items-center gap-1"><Home className="w-3 h-3 text-orange-400"/> 房產 {formatCurrency(realEstate)}</div>
            </div>
          </div>

          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between">
             <div className="flex flex-col gap-1">
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">今日損益 (Day P/L)</p>
                <div className="flex items-baseline gap-2">
                   <p className={`text-2xl font-bold ${totals.totalDayPL >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                     {totals.totalDayPL >= 0 ? '+' : ''}{formatCurrency(totals.totalDayPL)}
                   </p>
                </div>
             </div>
             <div className="h-px bg-gray-700 my-2"></div>
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-baseline">
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">總損益 (Total P/L)</p>
                    <span className={`text-xs font-mono ${totals.totalStockPLPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {totals.totalStockPLPercent >= 0 ? '+' : ''}{formatNumber(totals.totalStockPLPercent)}%
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                   <p className={`text-xl font-bold ${totals.totalStockPL >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                     {totals.totalStockPL >= 0 ? '+' : ''}{formatCurrency(totals.totalStockPL)}
                   </p>
                </div>
             </div>
             <div className="mt-2 pt-2 border-t border-gray-700/50 flex flex-col gap-0.5">
                <p className="text-gray-500 text-xs font-medium tracking-wider flex items-center gap-1"><PiggyBank className="w-3 h-3"/> 已實現損益 (Realized)</p>
                <p className={`text-lg font-bold font-mono ${realizedPL >= 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {realizedPL > 0 ? '+' : ''}{formatCurrency(realizedPL)}
                </p>
             </div>
          </div>

          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between gap-3 relative z-50">
             <div className="flex gap-2">
                <button onClick={() => setIsAdding(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 shadow-lg shadow-blue-900/20 cursor-pointer select-none active:scale-95">
                   <Plus className="w-4 h-4" /> 持股
                </button>
                <button onClick={() => handleUpdateAllPrices(false)} disabled={isUpdating} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 border cursor-pointer select-none active:scale-95 ${isUpdating ? 'bg-gray-800 border-gray-600 text-gray-400 cursor-wait' : 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600 hover:border-gray-500'}`}>
                   <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} /> 更新
                </button>
             </div>

             <button onClick={() => {setTempAssets({ cash, realEstate, realizedPL }); setIsEditingAssets(true);}} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-gray-600 cursor-pointer select-none active:scale-95">
                <Edit2 className="w-4 h-4" /> 編輯現金/房產等其他
             </button>
             
             <button onClick={handleAiAnalysis} className="md:hidden w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 cursor-pointer select-none active:scale-95">
                <Sparkles className="w-3 h-3" /> AI 診斷
             </button>

             <div className="min-h-[1rem] flex items-center justify-center text-center">
                {updateStatus ? (
                  <span className={`text-[10px] ${updateStatus.includes('失敗') ? 'text-red-400' : 'text-green-400'} animate-pulse`}>{updateStatus}</span>
                ) : lastUpdated ? (
                  <div className="flex items-center gap-1 text-[10px] text-gray-500"><Clock className="w-3 h-3" /><span>{lastUpdated.toLocaleTimeString()}</span></div>
                ) : null}
             </div>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-700 pb-1">
            <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'list' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}>持股列表</button>
            <button onClick={() => setActiveTab('chart')} className={`px-4 py-2 text-sm font-medium transition-all ${activeTab === 'chart' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-300'}`}>資產分佈圖</button>
        </div>

        {activeTab === 'chart' && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-[500px] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 shadow-lg relative">
             <div className="absolute top-6 left-6 flex gap-2 z-10">
                <div className="bg-gray-700 rounded-lg p-1 flex text-xs">
                    <button onClick={() => { setChartMode('grouped'); setDrillDownCategory(null); }} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${chartMode === 'grouped' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
                        <Layers className="w-3 h-3" /> 分類檢視
                    </button>
                    <button onClick={() => { setChartMode('all'); setDrillDownCategory(null); }} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${chartMode === 'all' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
                        <LayoutGrid className="w-3 h-3" /> 全部標的
                    </button>
                </div>
                {drillDownCategory && (
                    <button onClick={() => setDrillDownCategory(null)} className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg border border-gray-600 animate-in fade-in slide-in-from-left-2">
                        <ChevronLeft className="w-3 h-3" /> 返回總覽
                    </button>
                )}
             </div>

             <h3 className="text-lg font-bold mb-2 text-gray-300 self-center flex items-center gap-2 mt-8">
                <PieChartIcon className="w-5 h-5"/> 
                {drillDownCategory ? (drillDownCategory === 'TW' ? '台股分佈' : '美股分佈') : '資產分佈'}
             </h3>
             
             {totals.totalAssetValue > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                       data={chartData} 
                       cx="50%" 
                       cy="50%" 
                       innerRadius={60} 
                       outerRadius={105} 
                       paddingAngle={2} 
                       dataKey="value" 
                       stroke="none"
                       onClick={handleChartClick}
                       cursor={chartMode === 'grouped' && !drillDownCategory ? 'pointer' : 'default'}
                       label={({ name, percent }) => {
                           if (percent < 0.05) return null; 
                           return `${name} ${(percent * 100).toFixed(0)}%`;
                       }}
                       labelLine={true}
                   >
                     {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
                   {(chartMode === 'grouped' && !drillDownCategory) && (
                       <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                   )}
                 </PieChart>
               </ResponsiveContainer>
             ) : <div className="text-gray-500"><p>尚無資料</p></div>}
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-3 pb-12">
             <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-800/50 rounded-t-xl border-b border-gray-700">
               <div className="col-span-3 cursor-pointer hover:text-white flex items-center gap-1" onClick={() => handleMainSort('symbol')}>名稱/代號 <ArrowUpDown className="w-3 h-3"/></div>
               <div className="col-span-2 text-right">現價</div>
               <div className="col-span-2 text-right text-gray-400 cursor-pointer hover:text-white flex items-center justify-end gap-1" onClick={() => handleMainSort('dayPL')}>今日漲跌 <ArrowUpDown className="w-3 h-3"/></div>
               <div className="col-span-2 text-right cursor-pointer hover:text-white flex items-center justify-end gap-1" onClick={() => handleMainSort('value')}>市值 <ArrowUpDown className="w-3 h-3"/></div>
               <div className="col-span-2 text-right cursor-pointer hover:text-white flex items-center justify-end gap-1" onClick={() => handleMainSort('pl')}>總損益 <ArrowUpDown className="w-3 h-3"/></div>
               <div className="col-span-1 text-center">操作</div>
             </div>
             {isLoading ? <div className="space-y-3 mt-2">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse border border-gray-700"></div>)}</div>
             : sortedPortfolio.map(stock => {
               const pl = calculatePL(stock);
               const plPercent = calculatePLPercentage(stock);
               const marketVal = calculateMarketValue(stock);
               const dayChange = calculateDayChange(stock);
               const currencySymbol = stock.type === 'US' ? '$' : 'NT$';
               const isPriceValid = stock.currentPrice && stock.currentPrice > 0;
               
               return (
                 <div key={stock.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 md:py-3 transition-all hover:bg-gray-750 hover:border-gray-600 group shadow-sm mb-2">
                   <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                     <div className="flex justify-between md:block col-span-3 mb-3 md:mb-0">
                       <div className="flex items-center gap-3">
                         <div className={`w-1.5 h-10 rounded-full ${stock.type === 'US' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                         <div>
                            <div className="font-bold text-white flex items-center gap-2 text-lg md:text-base">
                              {stock.name}
                              <button onClick={() => openExternalLink(stock)} className="text-xs bg-gray-700 hover:bg-gray-600 px-1.5 py-0.5 rounded text-gray-300 font-mono tracking-wide flex items-center gap-1 transition-colors">{stock.symbol} <ExternalLink className="w-3 h-3 text-blue-400"/></button>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                               <span className={stock.type === 'US' ? 'text-blue-400' : 'text-purple-400'}>{stock.type === 'US' ? '美股' : '台股'}</span>
                               <span className="text-gray-600">•</span>
                               {formatNumber(stock.quantity, 0)} 股
                            </div>
                         </div>
                       </div>
                     </div>
                     
                     <div className="col-span-2 text-right flex flex-col items-end justify-center mb-2 md:mb-0">
                        <span className="text-gray-500 text-xs md:hidden mb-1">現價</span>
                        <div className="flex items-center justify-end">
                           <span className="text-gray-400 text-xs mr-1 font-sans">{currencySymbol}</span>
                           <span className={`font-mono font-bold text-lg md:text-base ${isPriceValid ? 'text-white' : 'text-yellow-500'}`}>{formatNumber(stock.currentPrice || stock.cost)}</span>
                           {!isPriceValid && <AlertCircle className="w-3 h-3 text-yellow-500 ml-1" title="使用成本估算" />}
                        </div>
                        <div className="text-xs text-gray-500">均價 {formatNumber(stock.cost)}</div>
                     </div>

                     <div className="col-span-2 flex justify-between items-center md:block md:text-right mb-2 md:mb-0">
                        <span className="text-gray-500 text-sm md:hidden">今日漲跌</span>
                        <div>
                            <div className={`font-bold ${dayChange.val >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {dayChange.val > 0 ? '+' : ''}{formatNumber(dayChange.val)}
                            </div>
                            <div className={`text-xs ${dayChange.percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {dayChange.percent > 0 ? '+' : ''}{formatNumber(dayChange.percent)}%
                            </div>
                        </div>
                     </div>

                     <div className="col-span-2 flex justify-between items-center md:block md:text-right mb-2 md:mb-0">
                        <span className="text-gray-500 text-sm md:hidden">市值</span>
                        <div className="font-bold text-white tracking-tight">{formatCurrency(marketVal)}</div>
                     </div>

                     <div className="hidden md:block col-span-2 text-right">
                        <div className={`font-bold ${pl >= 0 ? 'text-red-500' : 'text-green-500'}`}>{pl >= 0 ? '+' : ''}{formatCurrency(pl)}</div>
                        <div className={`text-xs font-mono ${pl >= 0 ? 'text-red-500' : 'text-green-500'}`}>{plPercent >= 0 ? '+' : ''}{formatNumber(plPercent)}%</div>
                     </div>

                     <div className="col-span-1 flex justify-end gap-1 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-gray-700 md:border-0">
                        <button onClick={() => setEditingItem(stock)} className="text-gray-400 hover:text-yellow-400 p-2 rounded-lg hover:bg-yellow-400/10 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleRemoveStock(stock.id)} className="text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                     </div>
                   </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* === MODALS MOVED OUTSIDE <main> TO PREVENT STACKING CONTEXT ISSUES ===
            This ensures they are always on top and clickable 
        */}

        {isEditingAssets && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                <button onClick={() => setIsEditingAssets(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Wallet className="w-5 h-5 text-teal-400" /> 其他資產配置</h3>
                <div className="space-y-4">
                   <div>
                      <label className="block text-xs text-gray-400 mb-1.5">現金存款 (TWD)</label>
                      <input type="number" value={tempAssets.cash} onChange={e => setTempAssets({...tempAssets, cash: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-teal-500 focus:outline-none font-mono text-lg" />
                   </div>
                   <div>
                      <label className="block text-xs text-gray-400 mb-1.5">房地產估值 (TWD)</label>
                      <input type="number" value={tempAssets.realEstate} onChange={e => setTempAssets({...tempAssets, realEstate: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none font-mono text-lg" />
                   </div>
                   <div className="pt-2 border-t border-gray-700/50">
                      <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1 text-orange-400"><PiggyBank className="w-3 h-3"/> 已實現損益 (歷史獲利/虧損)</label>
                      <input type="number" value={tempAssets.realizedPL} onChange={e => setTempAssets({...tempAssets, realizedPL: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-orange-500 focus:outline-none font-mono text-lg" placeholder="累計賣出獲利..." />
                      <p className="text-[10px] text-gray-500 mt-1">此數值僅作紀錄，不會重複計入總資產。</p>
                   </div>
                </div>
                <div className="mt-8 flex gap-3">
                   <button onClick={() => setIsEditingAssets(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium">取消</button>
                   <button onClick={handleSaveAssets} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-lg font-medium">儲存</button>
                </div>
             </div>
          </div>
        )}

        {showAiModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-gray-800 border border-purple-500/30 rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[80vh] overflow-y-auto">
                <button onClick={() => setShowAiModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">AI 投資組合診斷</h3>
                </div>

                {isAnalyzingPortfolio ? (
                    <div className="py-12 flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4"/>
                        <p className="text-white font-medium text-lg">AI 正在分析您的資產配置...</p>
                        <p className="text-gray-400 text-sm mt-2">正在計算風險指標與產業分佈</p>
                    </div>
                ) : (
                    <AiAnalysisRenderer content={aiAnalysisResult} />
                )}
             </div>
          </div>
        )}

        {isImporting && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className={`bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full shadow-2xl relative ${importStep === 'verify' ? 'max-w-3xl' : 'max-w-lg'}`}>
                <button onClick={() => { setIsImporting(false); setParsedItems([]); setTextImportContent(''); setImportStep('input'); setIsAnalyzingImage(false); setProcessedImgUrl(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                
                <div className="flex items-center gap-2 mb-4">
                    <ListPlus className="w-6 h-6 text-blue-400" />
                    <h3 className="text-xl font-bold text-white">
                        {importStep === 'input' ? '批次匯入資料' : '檢查與確認'}
                    </h3>
                </div>

                {importStep === 'input' ? (
                    <>
                        <div className="flex border-b border-gray-700 mb-4">
                            <button onClick={() => setImportMode('ai_text')} className={`px-4 py-2 text-sm font-medium ${importMode === 'ai_text' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}>
                                <Sparkles className="w-3 h-3 inline mr-1"/> AI 語意貼上
                            </button>
                            <button onClick={() => setImportMode('image')} className={`px-4 py-2 text-sm font-medium ${importMode === 'image' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}>
                                上傳照片 (AI 增強版)
                            </button>
                            <button onClick={() => setImportMode('text')} className={`px-4 py-2 text-sm font-medium ${importMode === 'text' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}>
                                一般貼上
                            </button>
                        </div>

                        {importMode === 'ai_text' && (
                            <div className="space-y-4">
                                <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg text-sm text-gray-300">
                                    <p className="mb-2 font-bold text-white flex items-center gap-2"><MessageSquareQuote className="w-4 h-4"/> 隨意輸入，AI 幫你整理</p>
                                    <p>試試看直接打：「昨天買了五張台積電成本九百五，還有十股微軟價格四百」</p>
                                </div>
                                <textarea 
                                    value={textImportContent}
                                    onChange={(e) => setTextImportContent(e.target.value)}
                                    placeholder="請輸入您的交易描述..." 
                                    className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white font-sans text-base focus:border-purple-500 focus:outline-none"
                                ></textarea>
                                <button 
                                    onClick={handleAiTextImport} 
                                    disabled={!textImportContent.trim() || isAnalyzingImage} 
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isAnalyzingImage ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>}
                                    AI 智慧解析
                                </button>
                            </div>
                        )}

                        {importMode === 'image' && (
                            <div className="text-center py-4">
                                {isAnalyzingImage ? (
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4"/>
                                        <p className="text-white text-sm font-medium">{ocrStatus}</p>
                                        <div className="w-64 h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${ocrProgress}%` }}></div>
                                        </div>
                                        {processedImgUrl && (
                                            <div className="mt-4 p-2 bg-black/30 rounded border border-gray-700">
                                                <p className="text-xs text-gray-500 mb-1">機器影像預覽：</p>
                                                <img src={processedImgUrl} alt="Processed" className="h-24 object-contain mx-auto opacity-80" />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-center gap-4 mb-6">
                                            <label className="flex items-center gap-2 cursor-pointer bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-600 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/20">
                                                <input type="radio" name="ocrType" className="hidden" checked={ocrMarketType === 'auto'} onChange={() => setOcrMarketType('auto')} />
                                                <span className="text-sm">🌐 自動/混合</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-600 has-[:checked]:border-red-500 has-[:checked]:bg-red-500/20">
                                                <input type="radio" name="ocrType" className="hidden" checked={ocrMarketType === 'tw'} onChange={() => setOcrMarketType('tw')} />
                                                <span className="text-sm">🔴 僅台股</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer bg-gray-700/50 px-3 py-2 rounded-lg border border-gray-600 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-500/20">
                                                <input type="radio" name="ocrType" className="hidden" checked={ocrMarketType === 'us'} onChange={() => setOcrMarketType('us')} />
                                                <span className="text-sm">🔵 僅美股</span>
                                            </label>
                                        </div>

                                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Wand2 className="w-8 h-8 text-blue-400" />
                                        </div>
                                        <p className="text-gray-400 text-sm mb-2 px-8">請選擇包含庫存的截圖 (可多張)。</p>
                                        <p className="text-xs text-gray-500 mb-6">系統會自動進行去噪與高對比增強處理。</p>
                                        <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                        <button onClick={() => fileInputRef.current.click()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 mx-auto">
                                            <ImagePlus className="w-5 h-5"/> 選擇照片
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {importMode === 'text' && (
                            <div className="space-y-4">
                                <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 text-sm text-gray-400">
                                    <p className="mb-2 font-medium text-white">直接貼上券商 APP 庫存文字：</p>
                                    <code className="block bg-black/30 p-2 rounded mt-1 text-xs text-green-400 font-mono">2330 2000 580</code>
                                    <code className="block bg-black/30 p-2 rounded mt-1 text-xs text-green-400 font-mono">特斯拉 10 185</code>
                                </div>
                                <textarea 
                                    value={textImportContent}
                                    onChange={(e) => setTextImportContent(e.target.value)}
                                    placeholder="貼上文字..." 
                                    className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                                ></textarea>
                                <button onClick={handleTextPaste} disabled={!textImportContent.trim()} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium disabled:opacity-50">
                                    解析並進入校對
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg mb-4 text-xs text-blue-200 flex gap-2 items-start">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>請檢查下方辨識結果。OCR 可能將「8」看成「3」或漏字，請手動修正錯誤欄位後再匯入。</span>
                        </div>
                        
                        {/* New: Currency Selection for Batch */}
                        <div className="flex justify-end mb-2">
                             <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                <span className="px-2 py-1 text-xs text-gray-400 flex items-center">整批設為:</span>
                                <button 
                                    onClick={() => handleSetBatchCurrency('USD')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${activeBatchCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-blue-600/50'}`}
                                >
                                    USD
                                </button>
                                <button 
                                    onClick={() => handleSetBatchCurrency('TWD')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${activeBatchCurrency === 'TWD' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-purple-600/50'}`}
                                >
                                    TWD
                                </button>
                             </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-700 bg-gray-900/50 mb-4">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 cursor-pointer hover:text-white group" onClick={() => handleVerifySort('symbol')}>
                                            <div className="flex items-center gap-1">代號/名稱 <ArrowUpDown className="w-3 h-3 opacity-50 group-hover:opacity-100"/></div>
                                        </th>
                                        <th className="px-4 py-3 text-right cursor-pointer hover:text-white group" onClick={() => handleVerifySort('quantity')}>
                                            <div className="flex items-center justify-end gap-1"><ArrowUpDown className="w-3 h-3 opacity-50 group-hover:opacity-100"/> 股數</div>
                                        </th>
                                        <th className="px-4 py-3 text-right cursor-pointer hover:text-white group" onClick={() => handleVerifySort('cost')}>
                                            <div className="flex items-center justify-end gap-1"><ArrowUpDown className="w-3 h-3 opacity-50 group-hover:opacity-100"/> 成本</div>
                                        </th>
                                        <th className="px-4 py-3 w-28 text-center">幣別</th>
                                        <th className="px-4 py-3 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedParsedItems.map((item) => (
                                        <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                            <td className="px-2 py-2">
                                                <input 
                                                    type="text" 
                                                    value={item.symbol}
                                                    onChange={(e) => handleVerifyChange(item.id, 'symbol', e.target.value.toUpperCase())}
                                                    className="bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 rounded px-2 py-1 w-full text-white font-mono outline-none"
                                                />
                                                <div className="text-[10px] text-gray-500 px-2">{item.name}</div>
                                            </td>
                                            <td className="px-2 py-2">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity}
                                                    onChange={(e) => handleVerifyChange(item.id, 'quantity', e.target.value)}
                                                    className="bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 rounded px-2 py-1 w-full text-right text-white font-mono outline-none"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input 
                                                    type="number" 
                                                    value={item.cost}
                                                    onChange={(e) => handleVerifyChange(item.id, 'cost', e.target.value)}
                                                    className="bg-transparent border border-transparent hover:border-gray-600 focus:border-blue-500 rounded px-2 py-1 w-full text-right text-white font-mono outline-none"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <select 
                                                    value={item.currency}
                                                    onChange={(e) => handleVerifyChange(item.id, 'currency', e.target.value)}
                                                    className="bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="TWD">TWD</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button onClick={() => handleVerifyDelete(item.id)} className="text-gray-500 hover:text-red-400 p-1">
                                                    <Trash className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {parsedItems.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-8 text-gray-500">無有效資料，請手動新增</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleVerifyAdd} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-1">
                                <Plus className="w-4 h-4" /> 補增一列
                            </button>
                            <button onClick={mergeAndImportData} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-medium shadow-lg shadow-green-900/30 flex items-center justify-center gap-2">
                                <Save className="w-4 h-4" /> 確認無誤，合併匯入
                            </button>
                        </div>
                    </div>
                )}
             </div>
          </div>
        )}

        {isAdding && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Plus className="w-6 h-6 text-blue-400" /> 新增持股</h3>
                
                <div className="mb-6 bg-gray-900/50 rounded-xl p-4 border border-blue-500/20 flex flex-col gap-3">
                   <div>
                      <p className="text-sm text-white font-medium mb-1">大量持股匯入</p>
                      <p className="text-xs text-gray-400">支援 AI 增強照片辨識或文字貼上，並提供表格校對。</p>
                   </div>
                   <div className="flex gap-2">
                       <button onClick={() => { setIsImporting(true); setIsAdding(false); setImportMode('ai_text'); setImportStep('input'); }} className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-blue-500/30">
                           <Sparkles className="w-4 h-4" /> AI 語意
                       </button>
                       <button onClick={() => { setIsImporting(true); setIsAdding(false); setImportMode('image'); setImportStep('input'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-gray-600">
                           <Camera className="w-4 h-4" /> 照片
                       </button>
                       <button onClick={() => { setIsImporting(true); setIsAdding(false); setImportMode('text'); setImportStep('input'); }} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-gray-600">
                           <ClipboardPaste className="w-4 h-4" /> 貼上
                       </button>
                   </div>
                </div>

                <form onSubmit={handleAddStock}>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-1">
                        <label className="block text-xs text-gray-400 mb-1.5">代號 / 中文名稱</label>
                        <input type="text" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} onBlur={handleSymbolBlur} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none uppercase font-mono" placeholder="2330 / 特斯拉" required />
                     </div>
                     <div className="col-span-1">
                        <label className="block text-xs text-gray-400 mb-1.5">名稱</label>
                        <div className="relative">
                           <input type="text" value={newStock.name} onChange={e => setNewStock({...newStock, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none" />
                           {isFetchingName && <div className="absolute right-3 top-3"><Loader2 className="w-4 h-4 animate-spin text-blue-400"/></div>}
                        </div>
                     </div>
                     <div className="col-span-1">
                        <label className="block text-xs text-gray-400 mb-1.5">平均成本 (單股)</label>
                        <input type="number" step="0.01" value={newStock.cost} onChange={e => setNewStock({...newStock, cost: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none font-mono" required />
                     </div>
                     <div className="col-span-1">
                        <label className="block text-xs text-gray-400 mb-1.5 flex justify-between">
                            <span>持有數量</span>
                            {newStock.type === 'TW' && (
                                <div className="flex bg-gray-700 rounded-lg p-0.5">
                                    <button type="button" onClick={() => setInputUnit('shares')} className={`px-1.5 rounded text-[10px] ${inputUnit === 'shares' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>股</button>
                                    <button type="button" onClick={() => setInputUnit('sheets')} className={`px-1.5 rounded text-[10px] ${inputUnit === 'sheets' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>張</button>
                                </div>
                            )}
                        </label>
                        <input type="number" value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 focus:outline-none font-mono" required />
                        {newStock.type === 'TW' && inputUnit === 'sheets' && newStock.quantity > 0 && (
                            <div className="text-[10px] text-blue-400 mt-1 text-right">= {newStock.quantity * 1000} 股</div>
                        )}
                     </div>
                  </div>
                  <div className="mt-8 flex gap-3">
                     <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium">取消</button>
                     <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg font-medium">確認新增</button>
                  </div>
                </form>
             </div>
          </div>
        )}

        {editingItem && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <form onSubmit={handleUpdateStock} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                <button type="button" onClick={() => setEditingItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Edit2 className="w-5 h-5 text-yellow-400" /> 編輯持股</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2 bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex justify-between items-center mb-2">
                      <span className="font-bold text-lg text-white tracking-wide">{editingItem.symbol}</span>
                      <span className="text-sm text-gray-400">{editingItem.name}</span>
                   </div>
                   <div className="col-span-1">
                      <label className="block text-xs text-gray-400 mb-1.5">平均成本</label>
                      <input type="number" step="0.01" value={editingItem.cost} onChange={e => setEditingItem({...editingItem, cost: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-yellow-500 focus:outline-none font-mono" required />
                   </div>
                   <div className="col-span-1">
                      <label className="block text-xs text-gray-400 mb-1.5">持有股數</label>
                      <input type="number" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-yellow-500 focus:outline-none font-mono" required />
                   </div>
                </div>
                <div className="mt-8 flex gap-3">
                   <button type="button" onClick={() => setEditingItem(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium">取消</button>
                   <button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2.5 rounded-lg font-medium">儲存</button>
                </div>
             </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;