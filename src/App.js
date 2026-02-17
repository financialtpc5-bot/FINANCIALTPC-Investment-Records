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

// --- 常用台股中文對照表 ---
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
  '1301': '台塑', '1303': '南亞', '1326': '台化', '2353': '宏碁', '2383': '台光電',
  '2377': '微星', '2376': '技嘉', '2352': '佳世達', '2354': '鴻準',
  '0050': '元大台灣50', '0056': '元大高股息', '00878': '國泰永續高股息', '00929': '復華台灣科技優息',
  '00919': '群益台灣精選高息', '006208': '富邦台50', '00940': '元大台灣價值高息', '00713': '元大台灣高息低波',
  '00939': '統一台灣高息動能', '00944': '野村趨勢動能高息', '00946': '群益科技高息成長',
  '8926': '台汽電', '9933': '中鼎'
};

const US_STOCK_CN_MAP = {
  'TSLA': '特斯拉', 'AAPL': '蘋果', 'MSFT': '微軟', 'NVDA': '輝達', 
  'AMZN': '亞馬遜', 'GOOG': '谷歌', 'GOOGL': '谷歌', 'META': '臉書', 'TSM': '台積電ADR',
  'AMD': '超微', 'INTC': '英特爾', 'QCOM': '高通', 'AVGO': '博通', 'MU': '美光',
  'COST': '好市多', 'NFLX': '網飛', 'DIS': '迪士尼', 'NKE': '耐吉', 'SBUX': '星巴克',
  'KO': '可口可樂', 'PEP': '百事可樂', 'MCD': '麥當勞', 'JPM': '摩根大通', 'BAC': '美國銀行',
  'V': '威士卡', 'MA': '萬事達卡', 'BRK.B': '波克夏', 'QQQ': 'QQQ', 'VOO': 'S&P500', 
  'SPY': 'S&P500', 'IVV': 'S&P500', 'IBIT': '比特幣ETF'
};

const NAME_TO_SYMBOL_MAP = {};
Object.entries(TW_STOCK_MAP).forEach(([code, name]) => NAME_TO_SYMBOL_MAP[name] = code);
Object.entries(US_STOCK_CN_MAP).forEach(([name, code]) => NAME_TO_SYMBOL_MAP[name] = code);

// --- 3. Helper Functions ---
const safeNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};
const formatCurrency = (val) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(safeNum(val));
const formatNumber = (val, decimals = 2) => new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(safeNum(val));

// --- 4. API Helpers ---

// 強化版 Yahoo 搜尋
const fetchYahooSearch = async (query) => {
    try {
        const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=1&newsCount=0&enableFuzzyQuery=true&region=TW&lang=zh-Hant-TW`;
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        const data = await res.json();
        
        if (data.quotes && data.quotes.length > 0) {
            const stock = data.quotes[0];
            let type = 'US';
            if (stock.symbol.includes('.TW') || stock.symbol.includes('.TWO') || /^\d{4}$/.test(stock.symbol)) {
                type = 'TW';
            }
            return {
                symbol: stock.symbol,
                name: stock.shortname || stock.longname || stock.symbol,
                type: type,
                score: stock.score
            };
        }
    } catch (e) {
        // console.error("Search error", e);
    }
    return null;
};

// 強化版 Yahoo Data Fetcher
const fetchYahooData = async (ticker) => {
    const proxies = [
        (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    
    const candidates = [ticker];
    if (/^\d{4}$/.test(ticker) && !ticker.includes('.')) {
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

// --- 本機 + 聯網 混合智慧解析邏輯 ---
const smartParseWithSearch = async (text) => {
  const lines = text.split('\n');
  const results = [];

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const numbers = cleanLine.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || [];
    const potentialName = cleanLine.replace(/(\d+(?:\.\d+)?)/g, '').replace(/[,，/\\股張元costprice]/gi, '').trim();

    let symbol = '';
    let name = potentialName;
    let type = 'TW';

    if (potentialName) {
        const isCode = /^\d{4}$/.test(potentialName) || /^[A-Z]{1,5}$/.test(potentialName.toUpperCase());
        
        if (isCode) {
            symbol = potentialName.toUpperCase();
            type = /^\d{4}$/.test(symbol) ? 'TW' : 'US';
            if(type === 'TW' && TW_STOCK_MAP[symbol]) name = TW_STOCK_MAP[symbol];
            if(type === 'US' && US_STOCK_CN_MAP[symbol]) name = US_STOCK_CN_MAP[symbol];
        } else {
            if (NAME_TO_SYMBOL_MAP[potentialName]) {
                symbol = NAME_TO_SYMBOL_MAP[potentialName];
                type = /^\d{4}$/.test(symbol) ? 'TW' : 'US';
            } else {
                const searchRes = await fetchYahooSearch(potentialName);
                if (searchRes) {
                    symbol = searchRes.symbol;
                    name = searchRes.name;
                    type = searchRes.type;
                } else {
                    symbol = potentialName;
                }
            }
        }
    }

    if (!symbol && numbers.length === 0) continue;

    let quantity = 0;
    let cost = 0;
    const hasSheet = cleanLine.includes('張'); 
    const hasShare = cleanLine.includes('股');

    if (numbers.length >= 2) {
       quantity = numbers[0];
       cost = numbers[1];
    } else if (numbers.length === 1) {
       quantity = numbers[0];
    }

    let unit = 'shares'; 
    if (type === 'TW') {
      if (hasSheet) {
         unit = 'sheets'; 
      } else if (!hasShare && quantity > 0 && quantity < 1000) {
         unit = 'sheets'; 
      }
    }

    results.push({
      id: crypto.randomUUID(),
      symbol: symbol.toUpperCase(),
      name,
      type,
      quantity, 
      cost,
      unit,     
      currency: type === 'US' ? 'USD' : 'TWD',
      currentPrice: cost 
    });
  }
  return results;
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
  const [editingItem, setEditingItem] = useState(null);

  const [importStep, setImportStep] = useState('input');
  const [textImportContent, setTextImportContent] = useState('');
  const [parsedItems, setParsedItems] = useState([]); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBatchCurrency, setActiveBatchCurrency] = useState(null); 
  const [updateStatus, setUpdateStatus] = useState('');

  const [verifySortConfig, setVerifySortConfig] = useState({ key: null, direction: 'asc' });
  const [mainSortConfig, setMainSortConfig] = useState({ key: 'value', direction: 'desc' });
  const [chartMode, setChartMode] = useState('grouped'); 
  const [drillDownCategory, setDrillDownCategory] = useState(null); 
  const [activeTab, setActiveTab] = useState('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isFetchingName, setIsFetchingName] = useState(false);
  // Add missing state for autoUpdateEnabled
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  
  const timerRef = useRef(null);
  const [newStock, setNewStock] = useState({ symbol: '', name: '', type: 'TW', cost: '', quantity: '', currentPrice: '' });
  const [inputUnit, setInputUnit] = useState('shares');
  const [tempAssets, setTempAssets] = useState({ cash: '', realEstate: '', realizedPL: '' });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const initAuth = async () => { try { await signInAnonymously(auth); } catch (e) { console.error(e); } };
    initAuth();
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // --- ACTIONS (MOVED UP) ---
  const saveToFirestore = async (data, id) => {
      if(!user) return;
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items', id || crypto.randomUUID()), data);
  };
  
  const saveSettings = async (data) => {
      if(!user) return;
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), data, { merge: true });
  };

  const handleUpdateAllPrices = useCallback(async (silent = false) => {
    if (!silent) setIsUpdating(true);
    if (!silent) setUpdateStatus('連線中...');
    try {
      const rateData = await fetchYahooData('TWD=X');
      if (rateData?.price) {
          setExchangeRate(Number(rateData.price));
          await saveSettings({ exchangeRate: Number(rateData.price) });
      }
      await Promise.all(portfolio.map(async (s) => {
        let q = s.symbol;
        if (s.type === 'TW' && !s.symbol.includes('.')) q = `${s.symbol}.TW`;
        const d = await fetchYahooData(q);
        if (d?.price) await saveToFirestore({ ...s, currentPrice: d.price, prevClose: d.prevClose }, s.id);
      }));
      setLastUpdated(new Date());
      if (!silent) setUpdateStatus('更新完成');
    } catch (e) { if (!silent) setUpdateStatus('更新失敗'); }
    finally { if (!silent) setIsUpdating(false); }
  }, [portfolio]); 

  // --- Data Sync ---
  useEffect(() => {
    if (!user) return;
    const unsubP = onSnapshot(query(collection(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items')), (s) => {
      setPortfolio(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
    const unsubS = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), (d) => {
      if (d.exists()) {
        const data = d.data();
        if (data.exchangeRate) setExchangeRate(safeNum(data.exchangeRate));
        if (data.cash !== undefined) setCash(data.cash === 0 ? '' : safeNum(data.cash));
        if (data.realEstate !== undefined) setRealEstate(data.realEstate === 0 ? '' : safeNum(data.realEstate));
        if (data.realizedPL !== undefined) setRealizedPL(data.realizedPL === 0 ? '' : safeNum(data.realizedPL));
      }
    });
    return () => { unsubP(); unsubS(); };
  }, [user]);

  // --- Auto Update ---
  useEffect(() => {
    if (user && portfolio.length > 0) {
       if (!lastUpdated) setTimeout(() => handleUpdateAllPrices(true), 2000);
       timerRef.current = setInterval(() => handleUpdateAllPrices(true), 60000);
    }
    return () => clearInterval(timerRef.current);
  }, [autoUpdateEnabled, user, portfolio.length, handleUpdateAllPrices]);

  // Calculations
  const calculateMarketValue = (s) => {
    const qty = safeNum(s.quantity);
    const price = s.currentPrice > 0 ? safeNum(s.currentPrice) : safeNum(s.cost);
    const rate = s.type === 'US' ? safeNum(exchangeRate) : 1;
    return price * qty * rate;
  };
  const calculateCostBasis = (s) => {
    const qty = safeNum(s.quantity);
    const cost = safeNum(s.cost);
    const rate = s.type === 'US' ? safeNum(exchangeRate) : 1;
    return cost * qty * rate;
  };
  const calculatePL = (s) => calculateMarketValue(s) - calculateCostBasis(s);
  const calculatePLPercentage = (s) => {
    const basis = calculateCostBasis(s);
    return basis === 0 ? 0 : (calculatePL(s) / basis) * 100;
  };
  const calculateDayChange = (s) => {
    if (!s.prevClose) return { val: 0, percent: 0 };
    const current = s.currentPrice || s.cost;
    const change = current - s.prevClose;
    return { val: change, percent: (change / s.prevClose) * 100 };
  };

  const totals = useMemo(() => {
    let stockAssetValue = 0;
    let stockCostValue = 0;
    let totalDayPL = 0; 
    portfolio.forEach(s => {
      stockAssetValue += calculateMarketValue(s);
      stockCostValue += calculateCostBasis(s);
      if(s.prevClose) {
          const change = (s.currentPrice - s.prevClose);
          const rate = s.type === 'US' ? safeNum(exchangeRate) : 1;
          totalDayPL += change * s.quantity * rate;
      }
    });
    const totalStockPL = stockAssetValue - stockCostValue;
    const totalStockPLPercent = stockCostValue === 0 ? 0 : (totalStockPL / stockCostValue) * 100;
    const totalAssetValue = stockAssetValue + safeNum(cash) + safeNum(realEstate);
    const prevMarketValue = totalAssetValue - totalDayPL;
    const totalDayChangePercent = prevMarketValue === 0 ? 0 : (totalDayPL / prevMarketValue) * 100;
    return { totalAssetValue, stockAssetValue, totalStockPL, totalStockPLPercent, totalDayPL, totalDayChangePercent };
  }, [portfolio, exchangeRate, cash, realEstate]);

  const sortedPortfolio = useMemo(() => {
    let items = [...portfolio];
    if (mainSortConfig.key) {
      items.sort((a, b) => {
        let valA = 0, valB = 0;
        if (mainSortConfig.key === 'symbol') return mainSortConfig.direction === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
        if (mainSortConfig.key === 'value') { valA = calculateMarketValue(a); valB = calculateMarketValue(b); }
        else if (mainSortConfig.key === 'pl') { valA = calculatePL(a); valB = calculatePL(b); }
        else if (mainSortConfig.key === 'dayPL') { valA = calculateDayChange(a).percent; valB = calculateDayChange(b).percent; }
        return mainSortConfig.direction === 'asc' ? valA - valB : valB - valA;
      });
    }
    return items;
  }, [portfolio, mainSortConfig, exchangeRate]);

  const chartData = useMemo(() => {
    const data = [];
    let tw = 0, us = 0;
    portfolio.forEach(s => {
        const v = calculateMarketValue(s);
        if(s.type === 'TW') tw += v; else us += v;
        if (chartMode === 'all' || (chartMode === 'grouped' && drillDownCategory === s.type)) {
            data.push({ name: s.name || s.symbol, value: v, type: 'stock' });
        }
    });
    if (chartMode === 'grouped' && !drillDownCategory) {
        if (tw > 0) data.push({ name: '台股', value: tw, color: CATEGORY_COLORS.TW, type: 'TW' });
        if (us > 0) data.push({ name: '美股', value: us, color: CATEGORY_COLORS.US, type: 'US' });
        if (safeNum(cash) > 0) data.push({ name: '現金', value: safeNum(cash), color: CATEGORY_COLORS.Cash });
        if (safeNum(realEstate) > 0) data.push({ name: '房地產', value: safeNum(realEstate), color: CATEGORY_COLORS.RealEstate });
    }
    return data.sort((a, b) => b.value - a.value);
  }, [portfolio, chartMode, drillDownCategory, cash, realEstate, exchangeRate]);

  const handleRemoveStock = async (id) => { if(user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items', id)); };
  
  const handleSymbolBlur = async () => {
     if (!newStock.symbol) return;
     setIsFetchingName(true);
     let sym = newStock.symbol.toUpperCase();
     let type = /^\d{4}$/.test(sym) ? 'TW' : 'US';
     // 本地與聯網雙重搜尋
     if (NAME_TO_SYMBOL_MAP[newStock.symbol]) {
         sym = NAME_TO_SYMBOL_MAP[newStock.symbol];
         type = /^\d{4}$/.test(sym) ? 'TW' : 'US';
     } else {
         const res = await fetchYahooSearch(sym);
         if (res) { sym = res.symbol; type = res.type; }
     }
     const price = await fetchYahooData(sym);
     setNewStock(p => ({ ...p, symbol: sym, type, name: TW_STOCK_MAP[sym] || US_STOCK_CN_MAP[sym] || sym, currentPrice: price?.price || 0, prevClose: price?.prevClose || 0 }));
     setIsFetchingName(false);
  };

  const handleAddStock = async (e) => {
      e.preventDefault();
      await saveToFirestore({ ...newStock, cost: Number(newStock.cost), quantity: Number(newStock.quantity) * (inputUnit === 'sheets' ? 1000 : 1) });
      setIsAdding(false);
      setNewStock({ symbol: '', name: '', type: 'TW', cost: '', quantity: '', currentPrice: '' });
      handleUpdateAllPrices(true);
  };

  const handleUpdateStock = async (e) => {
      e.preventDefault();
      await saveToFirestore({ ...editingItem, cost: Number(editingItem.cost), quantity: Number(editingItem.quantity) }, editingItem.id);
      setEditingItem(null);
  };

  const handleSaveAssets = async () => {
      await saveSettings({ 
        cash: tempAssets.cash === '' ? 0 : Number(tempAssets.cash), 
        realEstate: tempAssets.realEstate === '' ? 0 : Number(tempAssets.realEstate), 
        realizedPL: tempAssets.realizedPL === '' ? 0 : Number(tempAssets.realizedPL) 
      });
      setIsEditingAssets(false);
  };

  const handleSmartParse = async () => {
      if (!textImportContent.trim()) return;
      setUpdateStatus('智慧解析中 (嘗試聯網搜尋)...');
      setIsAnalyzing(true);
      
      const results = await smartParseWithSearch(textImportContent);
      
      setParsedItems(results);
      setIsAnalyzing(false);
      setImportStep('verify'); 
      
      if (results.length > 0) {
        setUpdateStatus(`解析完成，共 ${results.length} 筆`);
      } else {
        setUpdateStatus('無法辨識，請確認格式 (例如: 中鼎 3張 30)');
      }
  };

  const handleVerifyChange = (id, field, val) => setParsedItems(p => p.map(i => i.id === id ? { ...i, [field]: val } : i));
  
  const mergeAndImportData = async () => {
      const batch = writeBatch(db);
      for (const item of parsedItems) {
          const finalQty = item.unit === 'sheets' ? Number(item.quantity) * 1000 : Number(item.quantity);
          const ref = doc(collection(db, 'artifacts', appId, 'users', user.uid, 'portfolio_items'));
          batch.set(ref, { 
              symbol: item.symbol, name: item.name, type: item.type, 
              cost: Number(item.cost), quantity: finalQty, 
              currentPrice: Number(item.currentPrice || item.cost), prevClose: Number(item.cost) 
          });
      }
      await batch.commit();
      setIsImporting(false);
      setParsedItems([]);
      setTextImportContent('');
      handleUpdateAllPrices(true); 
  };

  const handleVerifyDelete = (id) => setParsedItems(prev => prev.filter(item => item.id !== id));
  const handleSetBatchCurrency = (c) => setParsedItems(p => p.map(i => ({...i, currency: c})));
  const handleMergeDuplicates = () => { 
      const mergedMap = {};
      let mergeCount = 0;
      parsedItems.forEach(item => {
          const key = `${item.symbol}_${item.type}`;
          if (mergedMap[key]) {
              const existing = mergedMap[key];
              const totalOldCost = existing.cost * existing.quantity;
              const totalNewCost = Number(item.cost) * Number(item.quantity);
              const newTotalQty = existing.quantity + Number(item.quantity);
              const newAvgCost = (totalOldCost + totalNewCost) / newTotalQty;
              mergedMap[key] = { ...existing, quantity: newTotalQty, cost: Number(newAvgCost.toFixed(2)) };
              mergeCount++;
          } else {
              mergedMap[key] = { ...item };
          }
      });
      if (mergeCount > 0) {
          setParsedItems(Object.values(mergedMap));
          setUpdateStatus(`已自動合併 ${mergeCount} 筆重複持股`);
      } else {
          setUpdateStatus('未發現重複持股');
      }
  }; 

  const openExternalLink = (stock) => {
    const url = stock.type === 'TW' ? `https://tw.stock.yahoo.com/quote/${stock.symbol.replace('.TW', '')}` : `https://finance.yahoo.com/quote/${stock.symbol}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans pb-20 relative">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 p-4 flex justify-between items-center shadow-md">
         <div className="flex items-center gap-2"><Activity className="text-blue-400"/><h1 className="text-xl font-bold">MyPortfolio</h1></div>
         <div className="flex gap-3 items-center">
             <div className="bg-gray-700/50 px-3 py-1 rounded text-sm"><span className="text-gray-400 mr-2">USD</span><span className="text-green-400">{Number(exchangeRate).toFixed(2)}</span></div>
             {user ? <Cloud className="w-4 h-4 text-blue-400"/> : <CloudOff className="w-4 h-4 text-gray-500"/>}
         </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
         {/* Dashboard */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="md:col-span-2 bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-xl border border-gray-700 shadow-lg relative">
                 <p className="text-gray-400 text-sm font-medium">總資產 (TWD)</p>
                 <p className="text-4xl font-bold mt-1">{formatCurrency(totals.totalAssetValue)}</p>
                 <div className="flex gap-4 mt-4 text-xs text-gray-400">
                    <span>股票 {formatCurrency(totals.stockAssetValue)}</span>
                    <span>現金 {formatCurrency(Number(cash))}</span>
                 </div>
             </div>
             <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
                 <p className="text-gray-400 text-sm font-medium">總損益</p>
                 <div className="flex items-baseline gap-2">
                     <p className={`text-xl font-bold ${totals.totalStockPL >= 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(totals.totalStockPL)}</p>
                     <span className={`text-xs ${totals.totalStockPLPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>({Number(totals.totalStockPLPercent).toFixed(1)}%)</span>
                 </div>
                 <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-400 flex justify-between">
                     <span>今日: <span className={totals.dayPL >= 0 ? 'text-red-500' : 'text-green-500'}>{formatCurrency(totals.dayPL)}</span></span>
                     <span>已實現: <span className="text-orange-400">{formatCurrency(Number(realizedPL))}</span></span>
                 </div>
             </div>
             
             {/* Action Panel - Sticky & Z-Index Fixed */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col gap-2 sticky bottom-4" style={{ zIndex: 9999, position: 'relative' }}>
                 <div className="flex gap-2">
                    <button onClick={() => setIsAdding(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1 active:scale-95"><Plus className="w-4 h-4"/> 持股</button>
                    <button onClick={() => handleUpdateAllPrices(false)} className="px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg active:scale-95"><RefreshCw className={`w-4 h-4 ${isUpdating?'animate-spin':''}`}/></button>
                 </div>
                 <button onClick={() => { setTempAssets({ cash: cash === 0 ? '' : cash, realEstate: realEstate === 0 ? '' : realEstate, realizedPL: realizedPL === 0 ? '' : realizedPL }); setIsEditingAssets(true); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm active:scale-95">編輯資產配置</button>
                 <div className="text-center text-[10px] text-gray-500 h-4">{updateStatus}</div>
             </div>
         </div>

         {/* Chart & List Toggle */}
         <div className="flex gap-2 border-b border-gray-700 pb-1">
             <button onClick={() => setActiveTab('list')} className={`px-4 py-2 text-sm font-medium ${activeTab==='list' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>持股列表</button>
             <button onClick={() => setActiveTab('chart')} className={`px-4 py-2 text-sm font-medium ${activeTab==='chart' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>資產分佈</button>
         </div>

         {activeTab === 'chart' && (
             <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 h-[400px]">
                 <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                         <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => percent < 0.03 ? null : `${name} ${(percent * 100).toFixed(1)}%`}>
                             {chartData.map((e, i) => <Cell key={i} fill={e.color || COLORS[i % COLORS.length]} />)}
                         </Pie>
                         <Legend />
                     </PieChart>
                 </ResponsiveContainer>
             </div>
         )}

         {activeTab === 'list' && (
             <div className="space-y-3 pb-20">
                 {/* Table Header (FORCED VISIBLE) */}
                 <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-400 border-b border-gray-700 bg-gray-800/50 rounded-t-xl uppercase">
                     <div className="col-span-3 cursor-pointer" onClick={() => handleMainSort('symbol')}>代號/名稱 <ArrowUpDown className="w-3 h-3 inline"/></div>
                     <div className="col-span-3 text-right">現價/成本</div>
                     <div className="col-span-3 text-right cursor-pointer" onClick={() => handleMainSort('dayPL')}>漲跌/報酬</div>
                     <div className="col-span-2 text-right cursor-pointer" onClick={() => handleMainSort('value')}>市值/損益</div>
                     <div className="col-span-1 text-center">操作</div>
                 </div>
                 {sortedPortfolio.map(s => {
                     const pl = calculatePL(s);
                     const plP = calculatePLPercentage(s);
                     const day = calculateDayChange(s);
                     const marketVal = calculateMarketValue(s);
                     const currencySymbol = s.type === 'US' ? '$' : 'NT$';
                     return (
                         <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 grid grid-cols-12 gap-2 items-center hover:bg-gray-750 transition-colors">
                             <div className="col-span-3">
                                 <div className="font-bold text-white text-base">{s.name}</div>
                                 <div className="text-xs text-gray-500 font-mono">{s.symbol}</div>
                                 <div className="text-[10px] text-gray-600 mt-1">{formatNumber(s.quantity)} {s.type === 'TW' && s.quantity >= 1000 ? '股' : '股'}</div>
                             </div>
                             
                             <div className="col-span-3 text-right">
                                 <div className="font-bold text-white">{currencySymbol}{formatNumber(s.currentPrice)}</div>
                                 <div className="text-xs text-gray-500">均 {formatNumber(s.cost)}</div>
                             </div>

                             <div className="col-span-3 text-right">
                                 <div className={`text-sm font-bold ${day.val >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                     {day.percent > 0 ? '+' : ''}{formatNumber(day.percent)}%
                                 </div>
                                 <div className={`text-xs ${plP >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                     報酬 {plP > 0 ? '+' : ''}{formatNumber(plP)}%
                                 </div>
                             </div>

                             <div className="col-span-2 text-right">
                                <div className="text-sm font-bold text-white">{formatCurrency(marketVal)}</div>
                                <div className={`text-xs ${pl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {pl > 0 ? '+' : ''}{formatCurrency(pl)}
                                </div>
                             </div>
                             
                             <div className="col-span-1 flex flex-col gap-2 items-center">
                                <button onClick={() => setEditingItem(s)} className="text-gray-400 hover:text-yellow-400"><Edit2 className="w-4 h-4"/></button>
                                <button onClick={() => handleRemoveStock(s.id)} className="text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
                             </div>
                         </div>
                     )
                 })}
             </div>
         )}
      </main>

      {/* --- MODALS --- */}
      {isAdding && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl p-6 relative">
                  <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                  <h3 className="text-xl font-bold text-white mb-6">新增持股</h3>
                  
                  <div className="mb-6">
                      <button onClick={() => { setIsImporting(true); setImportStep('input'); }} className="w-full bg-purple-900/30 text-purple-400 border border-purple-500/30 py-3 rounded-lg flex justify-center gap-2 items-center text-sm"><MessageSquareQuote className="w-4 h-4 inline mr-1"/> 快速文字匯入 (例如: 中鼎 2張 30)</button>
                  </div>

                  <form onSubmit={handleAddStock} className="space-y-4">
                      <div><label className="text-xs text-gray-400">代號 (輸入中文自動轉代碼)</label><input className="w-full bg-gray-800 border-gray-600 rounded-lg p-3 text-white uppercase" value={newStock.symbol} onChange={e => setNewStock({...newStock, symbol: e.target.value})} onBlur={handleSymbolBlur} placeholder="如：2330 或 台積電"/></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-xs text-gray-400">成本</label><input type="number" className="w-full bg-gray-800 border-gray-600 rounded-lg p-3 text-white" value={newStock.cost} onChange={e => setNewStock({...newStock, cost: e.target.value})}/></div>
                          <div><label className="text-xs text-gray-400">股數</label><input type="number" className="w-full bg-gray-800 border-gray-600 rounded-lg p-3 text-white" value={newStock.quantity} onChange={e => setNewStock({...newStock, quantity: e.target.value})}/></div>
                      </div>
                      <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">確認新增</button>
                  </form>
              </div>
          </div>
      )}

      {isImporting && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 relative">
                  <button onClick={() => setIsImporting(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                  <h3 className="text-xl font-bold text-white mb-4">快速文字匯入</h3>
                  
                  {importStep === 'input' ? (
                      <div className="space-y-4">
                          <textarea className="w-full h-32 bg-gray-800 border-gray-700 rounded-lg p-3 text-white" placeholder="例：2330 2張 1000 &#10;中鼎 1000股 50" value={textImportContent} onChange={e => setTextImportContent(e.target.value)}></textarea>
                          <button onClick={handleSmartParse} disabled={!textImportContent.trim()} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold flex justify-center gap-2">
                             {isAnalyzing ? <Loader2 className="animate-spin"/> : <Sparkles/>} 開始解析 (含聯網搜尋)
                          </button>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div className="max-h-60 overflow-y-auto bg-gray-800 rounded-lg p-2">
                              {parsedItems.map(item => (
                                  <div key={item.id} className="flex justify-between items-center p-2 border-b border-gray-700">
                                      <span className="w-16 font-bold text-white">{item.symbol}</span>
                                      <div className="flex items-center gap-2">
                                          <input type="number" className="w-20 bg-gray-900 text-right text-white p-1 rounded" value={item.quantity} onChange={e => handleVerifyChange(item.id, 'quantity', e.target.value)} />
                                          {item.type === 'TW' && (
                                              <select className="bg-gray-700 text-white text-xs p-1 rounded" value={item.unit} onChange={e => handleVerifyChange(item.id, 'unit', e.target.value)}>
                                                  <option value="shares">股</option>
                                                  <option value="sheets">張</option>
                                              </select>
                                          )}
                                      </div>
                                      <input type="number" className="w-20 bg-gray-900 text-right text-white p-1 rounded" value={item.cost} onChange={e => handleVerifyChange(item.id, 'cost', e.target.value)} />
                                      <button onClick={() => handleVerifyDelete(item.id)} className="text-red-400"><Trash className="w-4 h-4"/></button>
                                  </div>
                              ))}
                          </div>
                          <button onClick={mergeAndImportData} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">確認匯入</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {isEditingAssets && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
              <div className="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl p-6 relative">
                  <button onClick={() => setIsEditingAssets(false)} className="absolute top-4 right-4 text-gray-400"><X/></button>
                  <h3 className="text-xl font-bold text-white mb-4">編輯資產配置</h3>
                  <div className="space-y-4">
                      <div><label className="text-xs text-gray-400">現金</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white" value={tempAssets.cash} onChange={e => setTempAssets({...tempAssets, cash: e.target.value})} /></div>
                      <div><label className="text-xs text-gray-400">房產</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white" value={tempAssets.realEstate} onChange={e => setTempAssets({...tempAssets, realEstate: e.target.value})} /></div>
                      <div><label className="text-xs text-orange-400">已實現損益</label><input type="number" className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white" value={tempAssets.realizedPL} onChange={e => setTempAssets({...tempAssets, realizedPL: e.target.value})} /></div>
                      <button onClick={handleSaveAssets} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">儲存</button>
                  </div>
              </div>
          </div>
      )}
      
      {editingItem && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)}>
             <div className="absolute inset-0 flex items-center justify-center p-4">
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
          </div>
        )}

      <footer className="w-full py-6 mt-12 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm flex justify-center items-center gap-2 text-gray-500 text-sm z-40 relative">
          <span>Prepared by</span>
          <a href="https://www.instagram.com/financial_tpc?igsh=MWV5dW8zMHpoMTllcg%3D%3D&utm_source=qr" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors group">
              <span className="font-bold tracking-wide">投資充電站</span>
              <Instagram className="w-4 h-4 group-hover:text-pink-500 transition-colors" />
              <span className="text-xs opacity-70 group-hover:opacity-100">financial_tpc</span>
          </a>
      </footer>
    </div>
  );
};

export default App;