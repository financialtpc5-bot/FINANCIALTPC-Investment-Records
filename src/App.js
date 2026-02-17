import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, RefreshCw, DollarSign, PieChart as PieChartIcon, Activity, Edit2, X, Cloud, CloudOff, ExternalLink, Loader2, Clock, AlertCircle, Home, Wallet, Sparkles, MessageSquareQuote, PiggyBank, Layers, LayoutGrid, ChevronLeft, Instagram, ArrowUpDown, ClipboardPaste, ListPlus, Save, Trash } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, writeBatch } from 'firebase/firestore';

// --- 1. Firebase 設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyD7QKNnfb9KhF8iPG7IofeuiY2mOpjCSYw",
  authDomain: "financialtpc-b6d38.firebaseapp.com",
  projectId: "financialtpc-b6d38",
  storageBucket: "financialtpc-b6d38.firebasestorage.app",
  messagingSenderId: "4897987034",
  appId: "1:4897987034:web:453588d84146c9b98d08e3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'my-stock-portfolio';

// --- 2. 靜態資料與設定 ---
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16', '#06b6d4', '#d946ef'];
const CATEGORY_COLORS = { TW: '#8b5cf6', US: '#3b82f6', RealEstate: '#f97316', Cash: '#14b8a6' };

// 台股中文對照表
const TW_STOCK_MAP = {
  '2330': '台積電', '2317': '鴻海', '2454': '聯發科', '2412': '中華電', '2308': '台達電',
  '2303': '聯電', '2881': '富邦金', '2882': '國泰金', '2886': '兆豐金', '2891': '中信金',
  '1216': '統一', '2002': '中鋼', '2912': '統一超', '2382': '廣達', '2357': '華碩',
  '2395': '研華', '2345': '智邦', '2207': '和泰車', '3711': '日月光投控', '2884': '玉山金',
  '2892': '第一金', '5880': '合庫金', '5871': '中租-KY', '2379': '瑞昱', '3008': '大立光',
  '2603': '長榮', '2609': '陽明', '2615': '萬海', '3034': '聯詠', '2327': '國巨',
  '2880': '華南金', '2885': '元大金', '3045': '台灣大', '4904': '遠傳', '2883': '凱基金',
  '2890': '永豐金', '1101': '台泥', '1102': '亞泥', '2887': '台新金', '5876': '上海商銀',
  '3037': '欣興', '2301': '光寶科', '2408': '南亞科', '6415': '矽力*-KY', '5903': '全家',
  '2344': '華邦電', '3231': '緯創', '6669': '緯穎', '2409': '友達', '3481': '群創',
  '2356': '英業達', '2324': '仁寶', '4938': '和碩', '9910': '豐泰', '9904': '寶成',
  '0050': '元大台灣50', '0056': '元大高股息', '00878': '國泰永續高股息', '00929': '復華台灣科技優息',
  '00919': '群益台灣精選高息', '006208': '富邦台50', '00940': '元大台灣價值高息',
  '8926': '台汽電', '2618': '長榮航', '2610': '華航', '2834': '臺企銀',
  '1301': '台塑', '1303': '南亞', '1326': '台化', '2353': '宏碁',
  '2383': '台光電', '2377': '微星', '2376': '技嘉', '2352': '佳世達', '2354': '鴻準'
};

const US_STOCK_CN_MAP = {
  'TSLA': '特斯拉', 'AAPL': '蘋果', 'MSFT': '微軟', 'NVDA': '輝達', 
  'AMZN': '亞馬遜', 'GOOG': '谷歌', 'GOOGL': '谷歌', 'META': '臉書', 'TSM': '台積電ADR',
  'AMD': '超微', 'INTC': '英特爾', 'QCOM': '高通', 'AVGO': '高通', 'MU': '博通',
  'COST': '好市多', 'NFLX': '網飛', 'DIS': '迪士尼', 'NKE': '耐吉', 'SBUX': '星巴克',
  'KO': '可口可樂', 'PEP': '百事可樂', 'MCD': '麥當勞', 'JPM': '摩根大通', 'BAC': '美國銀行',
  'V': '威士卡', 'MA': '萬事達卡', 'BRK.B': '波克夏', 'QQQ': 'QQQ', 'VOO': 'S&P500'
};

const NAME_TO_SYMBOL_MAP = {};
Object.entries(TW_STOCK_MAP).forEach(([code, name]) => NAME_TO_SYMBOL_MAP[name] = code);
Object.entries(US_STOCK_CN_MAP).forEach(([name, code]) => NAME_TO_SYMBOL_MAP[name] = code);

// --- 3. Helper Functions (防呆) ---
const safeNum = (val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

const formatCurrency = (val) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(safeNum(val));
const formatNumber = (val, decimals = 2) => new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(safeNum(val));

// --- 4. API Helpers ---

// Yahoo Search
const fetchYahooSearch = async (query) => {
    try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=5&newsCount=0&enableFuzzyQuery=false&region=TW&lang=zh-Hant-TW`;
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        if (data.quotes && data.quotes.length > 0) {
            const stock = data.quotes.find(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF') || data.quotes[0];
            let type = 'US';
            if (stock.symbol.includes('.TW') || stock.symbol.includes('.TWO') || /^\d{4}$/.test(stock.symbol)) {
                type = 'TW';
            }
            
            let finalName = stock.shortname || stock.longname || stock.symbol;
            const pureSymbol = stock.symbol.replace(/\.TW(O)?$/, '');
            if (type === 'TW' && TW_STOCK_MAP[pureSymbol]) {
                finalName = TW_STOCK_MAP[pureSymbol];
            } else if (type === 'US' && US_STOCK_CN_MAP[stock.symbol]) {
                finalName = US_STOCK_CN_MAP[stock.symbol];
            }

            return {
                symbol: stock.symbol,
                name: finalName,
                type: type,
                score: stock.score
            };
        }
    } catch (e) {
        console.error("Search error", e);
    }
    return null;
};

// Yahoo Data
const fetchYahooData = async (ticker) => {
    const proxies = [
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    ];
    
    const candidates = [ticker];
    if (/^\d{4}$/.test(ticker)) {
        candidates.push(`${ticker}.TW`, `${ticker}.TWO`);
    } else if (ticker.endsWith('.TW')) {
        candidates.push(ticker.replace('.TW', '.TWO'));
    }

    for (const symbol of candidates) {
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
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
                        prevClose: result.meta.chartPreviousClose || result.meta.previousClose,
                        symbol: symbol
                    };
                }
            } catch (e) { }
        }
    }
    return null;
};

// Gemini API (Text Only - Fixed)
const callGemini = async (prompt) => {
  const apiKey = ""; // 使用環境變數注入 Key (解決連線失敗)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || response.statusText);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) { 
      console.error("Gemini Error:", error);
      return null; 
  }
};

// --- Components ---
const AiAnalysisRenderer = ({ content }) => {
    if (!content) return null;
    if (typeof content !== 'string') return <div className="text-red-400">分析資料格式錯誤</div>;
    const sections = [
        { key: 'allocation', icon: <Activity className="w-5 h-5 text-blue-400"/>, title: '資產配置體檢', color: 'bg-blue-500/10 border-blue-500/20' },
        { key: 'risk', icon: <AlertCircle className="w-5 h-5 text-yellow-400"/>, title: '風險預警', color: 'bg-yellow-500/10 border-yellow-500/20' },
        { key: 'advice', icon: <Sparkles className="w-5 h-5 text-green-400"/>, title: '投資建議', color: 'bg-green-500/10 border-green-500/20' },
        { key: 'fun', icon: <MessageSquareQuote className="w-5 h-5 text-purple-400"/>, title: '趣味人設點評', color: 'bg-purple-500/10 border-purple-500/20' },
    ];
    return (
        <div className="space-y-4">
            {sections.map((section, idx) => {
                const marker = `${idx + 1}.`;
                const nextMarker = `${idx + 2}.`;
                const startIndex = content.indexOf(marker);
                if (startIndex === -1) return null;
                let endIndex = content.indexOf(nextMarker);
                if (endIndex === -1) endIndex = content.length;
                let text = content.substring(startIndex, endIndex).replace(marker, '').trim();
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
  
  // Modals
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingAssets, setIsEditingAssets] = useState(false);
  const [isImporting, setIsImporting] = useState(false); 
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Import State
  const [importStep, setImportStep] = useState('input');
  const [textImportContent, setTextImportContent] = useState('');
  const [parsedItems, setParsedItems] = useState([]); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBatchCurrency, setActiveBatchCurrency] = useState(null); 
  
  // Analysis State
  const [isAnalyzingPortfolio, setIsAnalyzingPortfolio] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');

  // UI State
  const [verifySortConfig, setVerifySortConfig] = useState({ key: null, direction: 'asc' });
  const [mainSortConfig, setMainSortConfig] = useState({ key: 'value', direction: 'desc' });
  const [chartMode, setChartMode] = useState('grouped'); 
  const [drillDownCategory, setDrillDownCategory] = useState(null); 
  const [activeTab, setActiveTab] = useState('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isFetchingName, setIsFetchingName] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  
  const timerRef = useRef(null);
  const [newStock, setNewStock] = useState({ symbol: '', name: '', type: 'TW', cost: '', quantity: '', currentPrice: '' });
  const [inputUnit, setInputUnit] = useState('shares');
  const [tempAssets, setTempAssets] = useState({ cash: '', realEstate: '', realizedPL: '' });
  const [isSearching, setIsSearching] = useState(false);

  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // Data Sync
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
        if (data.exchangeRate) setExchangeRate(safeNum(data.exchangeRate));
        if (data.cash !== undefined) setCash(safeNum(data.cash));
        if (data.realEstate !== undefined) setRealEstate(safeNum(data.realEstate));
        if (data.realizedPL !== undefined) setRealizedPL(safeNum(data.realizedPL));
      }
    });
    return () => { unsubscribePortfolio(); unsubscribeSettings(); };
  }, [user]);

  // Auto Update Interval
  useEffect(() => {
    if (user && portfolio.length > 0) {
       if (!lastUpdated) setTimeout(() => handleUpdateAllPrices(true), 2000);
       timerRef.current = setInterval(() => handleUpdateAllPrices(true), 60000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoUpdateEnabled, user, portfolio.length]);

  // Calculations
  const calculateMarketValue = (stock) => {
    const price = (stock.currentPrice > 0) ? stock.currentPrice : stock.cost;
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
    
    // Day Change Percent
    const prevMarketValue = totalAssetValue - totalDayPL;
    const totalDayChangePercent = prevMarketValue === 0 ? 0 : (totalDayPL / prevMarketValue) * 100;

    return { stockAssetValue, stockCostValue, totalStockPL, totalStockPLPercent, totalAssetValue, totalDayPL, totalDayChangePercent };
  }, [portfolio, exchangeRate, cash, realEstate]);

  const sortedPortfolio = useMemo(() => {
    let items = [...portfolio];
    if (mainSortConfig.key) {
      items.sort((a, b) => {
        let aVal = 0; let bVal = 0;
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
        let twTotal = 0; let usTotal = 0;
        portfolio.forEach(stock => {
            const val = calculateMarketValue(stock);
            if (stock.type === 'TW') twTotal += val; else if (stock.type === 'US') usTotal += val;
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
        cash: Number(tempAssets.cash) || 0, 
        realEstate: Number(tempAssets.realEstate) || 0,
        realizedPL: Number(tempAssets.realizedPL) || 0
    });
    setIsEditingAssets(false);
  };

  const handleRemoveStock = async (id) => {
    if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items', id));
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    await saveToFirestore({ ...editingItem, cost: Number(editingItem.cost), quantity: Number(editingItem.quantity) }, editingItem.id);
    setEditingItem(null);
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!newStock.symbol) return;
    try {
        let symbolUpper = newStock.symbol.toUpperCase();
        const existingStock = portfolio.find(s => s.symbol === symbolUpper && s.type === newStock.type);
        if (existingStock) {
            const totalQty = existingStock.quantity + Number(newStock.quantity);
            const avgCost = ((existingStock.cost * existingStock.quantity) + (Number(newStock.cost) * Number(newStock.quantity))) / totalQty;
            await saveToFirestore({ ...existingStock, cost: Number(avgCost.toFixed(2)), quantity: totalQty }, existingStock.id);
        } else {
            await saveToFirestore({ ...newStock, quantity: Number(newStock.quantity), cost: Number(newStock.cost) });
        }
        setNewStock({ symbol: '', name: '', type: 'TW', cost: '', quantity: '', currentPrice: '' });
        setIsAdding(false);
        handleUpdateAllPrices(true);
    } catch(e) { alert("新增失敗"); }
  };

  const handleUpdateAllPrices = useCallback(async (silent = false) => {
    if (!silent) setIsUpdating(true);
    if (!silent) setUpdateStatus('連線中...');
    try {
      const rateData = await fetchYahooData('TWD=X');
      if (rateData && rateData.price) {
          setExchangeRate(rateData.price);
          await saveSettings({ exchangeRate: rateData.price });
      }
      const updates = portfolio.map(async (stock) => {
        let apiTicker = stock.symbol;
        if (stock.type === 'TW' && !stock.symbol.includes('.')) apiTicker = `${stock.symbol}.TW`;
        const data = await fetchYahooData(apiTicker);
        if (data && data.price) {
          return saveToFirestore({ ...stock, currentPrice: data.price, prevClose: data.prevClose || stock.prevClose }, stock.id);
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      setLastUpdated(new Date());
      if (!silent) setUpdateStatus('更新完成');
    } catch (error) { if (!silent) setUpdateStatus('更新失敗'); } 
    finally { if (!silent) setIsUpdating(false); }
  }, [portfolio, exchangeRate]);

  // Search & Symbol
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
    if (/^[A-Z]+(\.[A-Z]+)?$/.test(symbol)) type = 'US'; else if (/^\d+$/.test(symbol)) type = 'TW';
    if (type === 'TW' && TW_STOCK_MAP[symbol]) resolvedName = TW_STOCK_MAP[symbol];

    if (!resolvedName) {
        setIsSearching(true);
        const searchResult = await fetchYahooSearch(symbol); 
        setIsSearching(false);
        if (searchResult) {
            symbol = searchResult.symbol; 
            resolvedName = searchResult.name;
            type = searchResult.type;
        }
    }

    let apiTicker = symbol;
    if (type === 'TW' && /^\d+$/.test(symbol)) apiTicker = `${symbol}.TW`;
    const data = await fetchYahooData(apiTicker);
    setNewStock(prev => ({
        ...prev, type, symbol, name: resolvedName || prev.name,
        currentPrice: data ? data.price : prev.currentPrice, prevClose: data ? data.prevClose : prev.currentPrice 
    }));
    if (type === 'TW') setInputUnit('shares'); else setInputUnit('shares');
    setIsFetchingName(false);
  };

  const openExternalLink = (stock) => {
    const url = stock.type === 'TW' ? `https://tw.stock.yahoo.com/quote/${stock.symbol.replace('.TW', '')}` : `https://finance.yahoo.com/quote/${stock.symbol}`;
    window.open(url, '_blank');
  };

  const handleAiAnalysis = async () => {
    if (portfolio.length === 0) return alert("請先新增持股");
    setIsAnalyzingPortfolio(true); setShowAiModal(true); setAiAnalysisResult('');
    const res = await callGemini(`分析此投資組合：${JSON.stringify(portfolio.map(s=>({s:s.symbol, n:s.name, v:calculateMarketValue(s)})))}. 給出資產配置建議、風險預警。繁體中文。`);
    setAiAnalysisResult(res);
    setIsAnalyzingPortfolio(false);
  };

  // Text Import with better prompt
  const handleAiTextImport = async () => {
    if (!textImportContent.trim()) return;
    setUpdateStatus('AI 正在解析語意...');
    setIsAnalyzing(true);
    // 更新為支援度更好的模型
    const prompt = `你是一個股票交易數據解析器。請將使用者的輸入文字轉換為 JSON Array 格式。
    使用者輸入： "${textImportContent}"
    回傳格式範例： [{ "symbol": "2330", "name": "台積電", "type": "TW", "quantity": 2000, "cost": 580, "currency": "TWD" }]
    
    嚴格規則：
    1. 辨識代號或中文名稱。
    2. **數量轉換**：若輸入「張」或「張數」或數字很小(如2)且是台股，請自動將數量乘以 1000（例如: 2 -> 2000）。若單位明確是股則不變。
    3. 若無成本則設為 0。
    4. Type 自動判斷：數字代碼為 TW，英文代碼為 US。
    5. Currency 自動判斷：TW 為 TWD，US 為 USD。
    6. **輸出**：只回傳純 JSON Array，不要包含任何 markdown 符號。`;

    const result = await callGemini(prompt);
    setIsAnalyzing(false);
    
    if (result) {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : result.replace(/```json/g, '').replace(/```/g, '').trim();
        const items = JSON.parse(jsonStr);
        if (Array.isArray(items)) {
           const itemsWithId = items.map(item => ({ ...item, id: crypto.randomUUID(), currency: item.currency || (item.type === 'US' ? 'USD' : 'TWD') }));
           setParsedItems(itemsWithId);
           setImportStep('verify');
           setUpdateStatus('AI 解析完成，請確認資料');
        } else { throw new Error("Parsed result is not an array"); }
      } catch (e) { 
          console.error("AI Parse Error", e);
          setUpdateStatus('AI 解析失敗，請確認格式或重試'); 
      }
    } else { setUpdateStatus('AI 連線失敗'); }
  };

  const handleSetBatchCurrency = (currency) => {
    setActiveBatchCurrency(currency);
    setParsedItems(prev => prev.map(item => ({ ...item, currency })));
  };

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
            const pureSymbol = batchItem.symbol.replace(/\.TW(O)?$/, '');
            if (batchItem.type === 'TW' && TW_STOCK_MAP[pureSymbol]) {
                name = TW_STOCK_MAP[pureSymbol];
            } else if (batchItem.type === 'TW' && TW_STOCK_MAP[batchItem.symbol]) {
                name = TW_STOCK_MAP[batchItem.symbol];
            }
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans selection:bg-blue-500/30 pb-20 relative">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2"><Activity className="text-blue-400 w-6 h-6" /><h1 className="text-xl font-bold">MyPortfolio</h1></div>
            <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-600/50"><span className="text-gray-400 mr-2 text-xs">USD</span><span className="font-mono text-green-400">{exchangeRate.toFixed(2)}</span></div>
                {user ? <Cloud className="w-4 h-4 text-blue-400"/> : <CloudOff className="w-4 h-4 text-gray-500"/>}
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl border border-gray-700 shadow-lg relative">
             <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">總市值資產 (TWD)</p>
             <p className="text-4xl font-bold mt-1 text-white">{formatCurrency(totals.totalAssetValue)}</p>
             <div className="flex gap-4 mt-4 text-xs text-gray-400">
               <div className="flex items-center gap-1"><Activity className="w-3 h-3 text-blue-400"/> 股票 {formatCurrency(totals.stockAssetValue)}</div>
               <div className="flex items-center gap-1"><Wallet className="w-3 h-3 text-teal-400"/> 現金 {formatCurrency(cash)}</div>
               <div className="flex items-center gap-1"><Home className="w-3 h-3 text-orange-400"/> 房產 {formatCurrency(realEstate)}</div>
            </div>
          </div>

          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between">
             <div className="flex flex-col gap-1">
                <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">今日損益</p>
                <div className="flex items-baseline gap-2">
                   <p className={`text-2xl font-bold ${totals.totalDayPL >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(totals.totalDayPL)}</p>
                   <span className={`text-xs font-mono ${totals.totalDayChangePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>({totals.totalDayChangePercent >= 0 ? '+' : ''}{formatNumber(totals.totalDayChangePercent)}%)</span>
                </div>
             </div>
             <div className="h-px bg-gray-700 my-2"></div>
             <div className="flex flex-col gap-1">
                <div className="flex justify-between items-baseline"><p className="text-gray-400 text-sm font-medium uppercase tracking-wider">累積總損益</p><span className={`text-xs font-mono ${totals.totalStockPLPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>{totals.totalStockPLPercent >= 0 ? '+' : ''}{formatNumber(totals.totalStockPLPercent)}%</span></div>
                <p className={`text-xl font-bold ${totals.totalStockPL >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(totals.totalStockPL)}</p>
             </div>
             <div className="mt-2 pt-2 border-t border-gray-700/50 flex flex-col gap-0.5">
                <p className="text-gray-500 text-xs font-medium tracking-wider flex items-center gap-1"><PiggyBank className="w-3 h-3"/> 已實現損益 (Realized)</p>
                <p className={`text-lg font-bold font-mono ${realizedPL >= 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                    {realizedPL > 0 ? '+' : ''}{formatCurrency(realizedPL)}
                </p>
             </div>
          </div>

          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between gap-3 relative" style={{ isolation: 'isolate', zIndex: 60 }}>
             <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdding(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold shadow-lg active:scale-95 flex items-center justify-center gap-1"><Plus className="w-4 h-4"/> 持股</button>
                <button onClick={() => handleUpdateAllPrices(false)} className="px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg active:scale-95"><RefreshCw className={`w-4 h-4 ${isUpdating?'animate-spin':''}`}/></button>
             </div>
             <button onClick={() => {setTempAssets({ cash: cash || '', realEstate: realEstate || '', realizedPL: realizedPL || '' }); setIsEditingAssets(true);}} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm active:scale-95">編輯資產配置</button>
             <button onClick={handleAiAnalysis} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg text-sm active:scale-95 flex items-center justify-center gap-1"><Sparkles className="w-4 h-4"/> AI 診斷</button>
             <div className="min-h-[1rem] flex items-center justify-center text-center">{updateStatus ? (<span className={`text-[10px] ${updateStatus.includes('失敗') ? 'text-red-400' : 'text-green-400'} animate-pulse`}>{updateStatus}</span>) : lastUpdated ? (<div className="flex items-center gap-1 text-[10px] text-gray-500"><Clock className="w-3 h-3" /><span>{lastUpdated.toLocaleTimeString()}</span></div>) : null}</div>
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
                    <button onClick={() => { setChartMode('grouped'); setDrillDownCategory(null); }} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${chartMode === 'grouped' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}><Layers className="w-3 h-3" /> 分類檢視</button>
                    <button onClick={() => { setChartMode('all'); setDrillDownCategory(null); }} className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${chartMode === 'all' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}><LayoutGrid className="w-3 h-3" /> 全部標的</button>
                </div>
                {drillDownCategory && (<button onClick={() => setDrillDownCategory(null)} className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg border border-gray-600 animate-in fade-in slide-in-from-left-2"><ChevronLeft className="w-3 h-3" /> 返回總覽</button>)}
             </div>
             <h3 className="text-lg font-bold mb-2 text-gray-300 self-center flex items-center gap-2 mt-8"><PieChartIcon className="w-5 h-5"/> {drillDownCategory ? (drillDownCategory === 'TW' ? '台股分佈' : '美股分佈') : '資產分佈'}</h3>
             {totals.totalAssetValue > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={105} paddingAngle={2} dataKey="value" stroke="none" onClick={handleChartClick} cursor={chartMode === 'grouped' && !drillDownCategory ? 'pointer' : 'default'} label={({ name, percent }) => { if (percent < 0.05) return null; return `${name} ${(percent * 100).toFixed(0)}%`; }} labelLine={true}>
                     {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />))}
                   </Pie>
                   <RechartsTooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
                   {(chartMode === 'grouped' && !drillDownCategory) && (<Legend verticalAlign="bottom" height={36} iconType="circle"/>)}
                 </PieChart>
               </ResponsiveContainer>
             ) : <div className="text-gray-500"><p>尚無資料</p></div>}
          </div>
        )}

        {activeTab === 'list' && (
         <div className="space-y-3 pb-20">
            {sortedPortfolio.map(s => {
               const dayChange = calculateDayChange(s);
               const pl = calculatePL(s);
               const plPercent = calculatePLPercentage(s);
               const currencySymbol = s.type === 'US' ? '$' : 'NT$';
               return (
                <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex justify-between items-center transition-all hover:border-gray-600">
                    <div>
                        <div className="font-bold text-white text-lg">{s.name} <span className="text-gray-500 text-xs font-mono">{s.symbol}</span></div>
                        <div className="text-xs text-gray-400">{formatNumber(s.quantity)} 股 • 成本 {formatNumber(s.cost)}</div>
                    </div>
                    
                    <div className="text-right">
                        <div className="flex flex-col items-end">
                            <div className="font-bold text-white text-lg">{currencySymbol}{formatNumber(s.currentPrice)}</div>
                            <div className={`text-xs ${dayChange.val >= 0 ? 'text-red-500' : 'text-green-500'} flex items-center gap-1`}>
                                {dayChange.val > 0 ? '+' : ''}{formatNumber(dayChange.percent)}%
                            </div>
                        </div>
                        <div className="mt-1 text-xs">
                             <span className="text-gray-500 mr-1">盈虧:</span>
                             <span className={pl >= 0 ? 'text-red-500' : 'text-green-500'}>
                                {pl >= 0 ? '+' : ''}{formatNumber(plPercent)}% ({formatCurrency(pl)})
                             </span>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1 ml-4 border-l border-gray-700 pl-4">
                        <button onClick={() => setEditingItem(s)} className="p-2 text-gray-400 hover:text-yellow-400 bg-gray-700/30 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleRemoveStock(s.id)} className="p-2 text-gray-400 hover:text-red-400 bg-gray-700/30 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                    </div>
                </div>
               );
            })}
         </div>
        )}
      </main>

      {/* --- MODALS --- */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsAdding(false)}>
            <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">新增持股</h2><button onClick={() => setIsAdding(false)}><X className="w-6 h-6 text-gray-400"/></button></div>
                
                {/* AI Text Import Option */}
                <div className="mb-6">
                    <button onClick={() => {setIsImporting(true); setImportStep('input'); }} className="w-full bg-purple-900/30 text-purple-400 border border-purple-500/30 py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all hover:bg-purple-900/50"><Sparkles className="w-4 h-4 inline mr-1"/> AI 語意貼上</button>
                </div>

                <form onSubmit={handleAddStock} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400">代號 (如 2330, 8926 或 NVDA)</label>
                        <div className="relative">
                            <input className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white uppercase focus:border-blue-500 outline-none" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} onBlur={handleSymbolBlur} required />
                            {isFetchingName && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-blue-400"/>}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-gray-400">成本</label><input type="number" step="0.01" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={newStock.cost} onChange={e => setNewStock({...newStock, cost: e.target.value})} required /></div>
                        <div><label className="text-xs text-gray-400">股數</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})} required /></div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-900/20">確認新增</button>
                </form>
            </div>
        </div>
      )}

      {showAiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAiModal(false)}>
              <div className="bg-gray-800 border border-purple-500/50 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400"/> AI 診斷結果</h3><button onClick={() => setShowAiModal(false)}><X className="w-6 h-6 text-gray-400"/></button></div>
                  {isAnalyzingPortfolio ? <div className="py-10 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>正在分析您的投資組合...</div> : <AiAnalysisRenderer content={aiAnalysisResult}/>}
              </div>
          </div>
      )}

      {isImporting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsImporting(false)}>
              <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="space-y-4">
                      <h3 className="text-xl font-bold text-white">確認匯入資料</h3>
                      {importStep === 'input' ? (
                         <div className="space-y-4">
                            <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded-lg text-sm text-gray-300"><p className="mb-2 font-bold text-white flex items-center gap-2"><MessageSquareQuote className="w-4 h-4"/> 隨意輸入 (AI)</p><p>試試看直接貼上券商文字，或輸入：「台積電 2張 成本 580」</p></div>
                            <textarea value={textImportContent} onChange={(e) => setTextImportContent(e.target.value)} placeholder="請輸入或貼上文字..." className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white font-sans text-base focus:border-purple-500 outline-none"></textarea>
                            <button onClick={handleAiTextImport} disabled={!textImportContent.trim() || isAnalyzing} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20">
                                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Sparkles className="w-5 h-5"/>} AI 解析資料
                            </button>
                         </div>
                      ) : (
                         <>
                            <div className="flex justify-end mb-2">
                                 <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700"><span className="px-2 py-1 text-xs text-gray-400 flex items-center">整批設為:</span><button onClick={() => handleSetBatchCurrency('USD')} className={`px-3 py-1 text-xs rounded transition-colors ${activeBatchCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-blue-600/50'}`}>USD</button><button onClick={() => handleSetBatchCurrency('TWD')} className={`px-3 py-1 text-xs rounded transition-colors ${activeBatchCurrency === 'TWD' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-purple-600/50'}`}>TWD</button></div>
                            </div>
                            <div className="max-h-60 overflow-y-auto bg-gray-800 rounded-lg p-2 border border-gray-700">
                                {parsedItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center p-2 border-b border-gray-700 text-sm text-gray-300">
                                        <input className="bg-transparent w-16 text-white border-b border-gray-600 focus:border-blue-500 outline-none" value={item.symbol} onChange={(e) => handleVerifyChange(item.id, 'symbol', e.target.value.toUpperCase())} />
                                        <input type="number" className="bg-transparent w-16 text-right text-white border-b border-gray-600 focus:border-blue-500 outline-none" value={item.quantity} onChange={(e) => handleVerifyChange(item.id, 'quantity', e.target.value)} />
                                        <input type="number" className="bg-transparent w-16 text-right text-white border-b border-gray-600 focus:border-blue-500 outline-none" value={item.cost} onChange={(e) => handleVerifyChange(item.id, 'cost', e.target.value)} />
                                        <button onClick={() => handleVerifyDelete(item.id)} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button onClick={() => { setIsImporting(false); setImportStep('input'); }} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold">取消</button>
                                <button onClick={mergeAndImportData} className="flex-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-green-900/20">確認帶入資料</button>
                            </div>
                         </>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isEditingAssets && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsEditingAssets(false)}>
              <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Wallet className="w-5 h-5 text-teal-400" /> 編輯資產配置</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs text-gray-400">💰 現金存款 (TWD)</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={tempAssets.cash} onChange={e => setTempAssets({...tempAssets, cash: e.target.value})} /></div>
                      <div><label className="text-xs text-gray-400">🏠 房地產估值 (TWD)</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={tempAssets.realEstate} onChange={e => setTempAssets({...tempAssets, realEstate: e.target.value})} /></div>
                      <div className="pt-2 border-t border-gray-700/50">
                          <label className="text-xs text-orange-400 flex items-center gap-1 font-bold">📈 已實現損益 (不計入總市值)</label>
                          <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white focus:border-orange-500 outline-none mt-1" value={tempAssets.realizedPL} onChange={e => setTempAssets({...tempAssets, realizedPL: e.target.value})} />
                      </div>
                      <div className="flex gap-2 pt-4">
                          <button onClick={() => setIsEditingAssets(false)} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold">取消</button>
                          <button onClick={handleSaveAssets} className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-900/20">儲存變更</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingItem(null)}>
             <form onSubmit={handleUpdateStock} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => setEditingItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Edit2 className="w-5 h-5 text-yellow-400" /> 編輯持股</h3>
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2 bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex justify-between items-center mb-2"><span className="font-bold text-lg text-white tracking-wide">{editingItem.symbol}</span><span className="text-sm text-gray-400">{editingItem.name}</span></div>
                   <div className="col-span-1"><label className="block text-xs text-gray-400 mb-1.5">平均成本</label><input type="number" step="0.01" value={editingItem.cost} onChange={e => setEditingItem({...editingItem, cost: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-yellow-500 outline-none font-mono" required /></div>
                   <div className="col-span-1"><label className="block text-xs text-gray-400 mb-1.5">持有股數</label><input type="number" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:border-yellow-500 outline-none font-mono" required /></div>
                </div>
                <div className="mt-8 flex gap-3">
                   <button type="button" onClick={() => setEditingItem(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg font-medium">取消</button>
                   <button type="submit" className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-yellow-900/20">儲存變更</button>
                </div>
             </form>
          </div>
        )}
      
      <footer className="w-full py-6 mt-12 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center gap-2 text-gray-500 text-sm">
          <span>Prepared by</span>
          <a href="https://www.instagram.com/financial_tpc" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors group">
              <span className="font-bold tracking-wide">投資充電站</span>
              <Instagram className="w-4 h-4 group-hover:text-pink-500 transition-colors" />
              <span className="text-xs opacity-70 group-hover:opacity-100">financial_tpc</span>
          </a>
      </footer>
    </div>
  );
};

export default App;