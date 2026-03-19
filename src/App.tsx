import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, updateProfile, User } from 'firebase/auth';
import { Home, Clock, Settings, LogOut, CheckCircle, UserCircle, Calendar, Sun, Moon, Globe, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'https://betting-api-worker.sansoe5227.workers.dev'; 

const translations = {
  en: {
    submitTab: "Submit", historyTab: "My Bets", settingsTab: "Settings",
    title: "Submit List", hello: "Hello", type: "Type", session: "Session", morning: "Morning", evening: "Evening",
    betsLabel: "Bets", submitBtn: "Submit",
    historyTitle: "My History", noRecords: "No records found.", total: "Total",
    settingsTitle: "Settings", profile: "Profile", displayName: "Display Name", 
    nameHint: "This name will be visible to the Admin.", save: "Save",
    account: "Account", email: "Connected Email", logout: "Logout",
    preferences: "Preferences", darkTheme: "Dark Theme", language: "Language",
    confirmTitle: "Confirm Submission", confirmDesc: "Please review your list before submitting.",
    cancel: "Cancel", confirmBtn: "Confirm & Send",
    logoutConfirmTitle: "Confirm Logout", logoutConfirmDesc: "Are you sure you want to log out?",
    rejectReason: "Reason for rejection"
  },
  my: {
    submitTab: "စာရင်းပို့ရန်", historyTab: "မှတ်တမ်း", settingsTab: "ဆက်တင်",
    title: "စာရင်းပေးပို့ရန်", hello: "မင်္ဂလာပါ", type: "အမျိုးအစား", session: "အချိန်", morning: "မနက်ပိုင်း", evening: "ညနေပိုင်း",
    betsLabel: "ထိုးကြေးများ", submitBtn: "ပေးပို့မည်",
    historyTitle: "ကျွန်ုပ်၏ မှတ်တမ်းများ", noRecords: "မှတ်တမ်း မရှိသေးပါ။", total: "စုစုပေါင်း",
    settingsTitle: "ဆက်တင်များ", profile: "ပရိုဖိုင်", displayName: "သင့်အမည် (Display Name)", 
    nameHint: "ဒီနာမည်ကို Admin ဘက်မှာ မြင်ရပါမည်။", save: "သိမ်းမည်",
    account: "အကောင့်", email: "ချိတ်ဆက်ထားသော အီးမေးလ်", logout: "အကောင့်ထွက်မည်",
    preferences: "အပြင်အဆင်များ", darkTheme: "အမှောင်မြင်ကွင်း", language: "ဘာသာစကား",
    confirmTitle: "စာရင်းအတည်ပြုရန်", confirmDesc: "မပို့မီ အောက်ပါအချက်အလက်များကို သေချာစစ်ဆေးပါ။",
    cancel: "ပယ်ဖျက်မည်", confirmBtn: "အတည်ပြုပြီး ပို့မည်",
    logoutConfirmTitle: "အကောင့်ထွက်ရန်", logoutConfirmDesc: "အကောင့်မှ ထွက်မှာ သေချာပါသလား?",
    rejectReason: "ပယ်ဖျက်ရသည့် အကြောင်းရင်း"
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'settings'>('submit');
  
  const [lang, setLang] = useState<'en' | 'my'>(() => (localStorage.getItem('app_lang') as 'en' | 'my') || 'en');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_dark_mode') === 'true');
  const t = translations[lang];

  const currentHour = new Date().getHours();
  const autoSession = currentHour < 12 ? 'morning' : 'evening';
  const [customerName, setCustomerName] = useState('');
  const [bettingType, setBettingType] = useState<'2D' | '3D'>('2D');
  const [session, setSession] = useState(autoSession);
  const [bettingData, setBettingData] = useState('');
  
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historySession, setHistorySession] = useState(autoSession);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [editName, setEditName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => { localStorage.setItem('app_lang', lang); }, [lang]);

  useEffect(() => {
    localStorage.setItem('app_dark_mode', String(isDarkMode));
    if (isDarkMode) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    getRedirectResult(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setCustomerName(currentUser.displayName || '');
        setEditName(currentUser.displayName || '');
        fetchMyBets(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try { await signInWithRedirect(auth, googleProvider); } 
    catch (error) { alert('Login error'); }
  };

  const executeLogout = () => {
    signOut(auth);
    setMyBets([]);
    setShowLogoutConfirm(false);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editName.trim()) return;
    setIsUpdatingName(true);
    try {
      await updateProfile(user, { displayName: editName });
      setCustomerName(editName);
      showToast(lang === 'my' ? 'နာမည် ပြောင်းလဲခြင်း အောင်မြင်ပါသည်။' : 'Name updated successfully!');
    } catch (error) {
      alert('Error updating name.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const fetchMyBets = async (userId: string) => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/my-bets?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setMyBets(data);
      }
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 3D 'R' အတွက် ၆ ကွက်တွက်ပေးမည့် စနစ်အသစ်
  const calculateTotal = (text: string) => {
    let total = 0;
    const entries: any[] = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const number = parts[0];
        let amountStr = parts[1].toUpperCase();
        let isReverse = amountStr.includes('R');
        let amount = parseInt(amountStr.replace('R', '')) || 0;
        
        if (amount > 0) {
          entries.push({ number, amount: amountStr });
          if (isReverse) {
            const perms = new Set<string>();
            const getPerms = (str: string, prefix = '') => {
              if (str.length === 0) perms.add(prefix);
              for (let i = 0; i < str.length; i++) {
                getPerms(str.slice(0, i) + str.slice(i + 1), prefix + str[i]);
              }
            };
            getPerms(number);
            total += amount * perms.size; // ခွေပတ်ဂဏန်း အရေအတွက်နဲ့ မြှောက်ပေးသည်
          } else {
            total += amount; 
          }
        }
      }
    });
    return { total, entries };
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bettingData.trim()) return;

    const { total, entries } = calculateTotal(bettingData);
    if (total === 0) {
      alert(lang === 'my' ? 'ပုံစံမှားယွင်းနေပါသည်။' : 'Invalid format.');
      return;
    }

    setPendingPayload({
      id: `sub_${Date.now()}`,
      user_id: user.uid,
      customer_name: customerName,
      betting_type: bettingType,
      betting_data: entries,
      total_amount: total,
      session: session,
      bet_date: new Date().toISOString().split('T')[0],
    });
    setShowConfirm(true); 
  };

  const handleFinalSubmit = async () => {
    if (!pendingPayload) return;
    setShowConfirm(false);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPayload),
      });

      if (response.ok) {
        showToast(lang === 'my' ? 'စာရင်းပေးပို့ခြင်း အောင်မြင်ပါသည်။' : 'Submitted successfully!');
        setBettingData('');
        fetchMyBets(user!.uid); 
        setActiveTab('history'); 
      } else {
        alert('Failed to submit.');
      }
    } catch (error) {
      alert('Network error.');
    }
  };

  const parseBettingData = (data: any) => {
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return Array.isArray(data) ? data : [];
  };

  const filteredBets = myBets.filter(bet => bet.bet_date === historyDate && bet.session === historySession);
  const placeholderHint = bettingType === '2D' ? (lang === 'my' ? "ဥပမာ - 12 500\n34 1000R" : "e.g., 12 500\n34 1000R") : (lang === 'my' ? "ဥပမာ - 123 500\n456 1000R" : "e.g., 123 500\n456 1000R");

  if (loading) return <div className="container"><p style={{textAlign: 'center', marginTop: 50}}>Loading...</p></div>;

  if (!user) {
    return (
      <div className="container login-screen">
        <h1 style={{ color: 'var(--primary)', marginBottom: '10px', fontSize: '28px' }}>Lucky 2D/3D</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Sign in to submit your list.</p>
        <button className="btn btn-primary no-select" onClick={handleLogin}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <>
      {toastMsg && (
        <div className="toast-container">
          <CheckCircle size={18} /> {toastMsg}
        </div>
      )}

      <div className="container">
        {activeTab === 'submit' && (
          <div className="fade-in">
            <div className="header">
              <h1>{t.title}</h1>
              <p style={{color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px'}}>
                {t.hello}, <span style={{fontWeight: 'bold', color: 'var(--primary)'}}>{customerName}</span>
              </p>
            </div>
            <div className="card">
              <form onSubmit={handlePreSubmit}>
                <div className="form-group">
                  <label className="form-label">{t.type}</label>
                  <div className="toggle-group no-select">
                    <button type="button" className={`toggle-btn ${bettingType === '2D' ? 'active' : ''}`} onClick={() => setBettingType('2D')}>2D (00-99)</button>
                    <button type="button" className={`toggle-btn ${bettingType === '3D' ? 'active' : ''}`} onClick={() => setBettingType('3D')}>3D (000-999)</button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t.session}</label>
                  <div className="toggle-group no-select">
                    <button type="button" className={`toggle-btn ${session === 'morning' ? 'active' : ''}`} onClick={() => setSession('morning')}><Sun size={14}/> {t.morning}</button>
                    <button type="button" className={`toggle-btn ${session === 'evening' ? 'active' : ''}`} onClick={() => setSession('evening')}><Moon size={14}/> {t.evening}</button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t.betsLabel}</label>
                  <textarea 
                    className="form-textarea" 
                    rows={6} 
                    value={bettingData} 
                    onChange={e => setBettingData(e.target.value)} 
                    placeholder={placeholderHint}
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary no-select">
                  <CheckCircle size={18} /> {t.submitBtn}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="fade-in">
            {/* Refresh Button ကို Header ထဲမှာ သေချာပေါ်အောင် ပြင်ထားသည် */}
            <div className="header" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <h1 style={{ margin: 0 }}>{t.historyTitle}</h1>
              <button 
                onClick={() => fetchMyBets(user.uid)} 
                className="no-select"
                style={{ position: 'absolute', right: '0', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px' }}
              >
                <RefreshCw size={22} className={isRefreshing ? 'spin' : ''} />
              </button>
            </div>

            <div className="date-bar">
              <div className="date-btn no-select">
                <Calendar size={15} />
                <span>{historyDate}</span>
                <input type="date" value={historyDate} onChange={(e) => { if (e.target.value) setHistoryDate(e.target.value); }} style={{ position: 'absolute', opacity: 0, left: 0, top: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
              </div>
            </div>
            <div className="toggle-group no-select" style={{ marginBottom: '16px' }}>
              <button type="button" className={`toggle-btn ${historySession === 'morning' ? 'active' : ''}`} onClick={() => setHistorySession('morning')}><Sun size={14} /> {t.morning}</button>
              <button type="button" className={`toggle-btn ${historySession === 'evening' ? 'active' : ''}`} onClick={() => setHistorySession('evening')}><Moon size={14} /> {t.evening}</button>
            </div>

            <div className="card">
              {filteredBets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                  <Clock size={40} style={{ opacity: 0.5, marginBottom: 10, margin: '0 auto' }} />
                  <p>{t.noRecords}</p>
                </div>
              ) : (
                <div>
                  {filteredBets.map(bet => {
                    const entries = parseBettingData(bet.betting_data);
                    return (
                      <div key={bet.id} className="bet-list-item">
                        <div className="bet-header">
                          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{bet.betting_type}</span>
                          <span className={`badge ${bet.status}`}>{bet.status}</span>
                        </div>
                        
                        <div className="bet-pill-container">
                          {entries.map((entry: any, i: number) => (
                            <span key={i} className="bet-pill">
                              {entry.number} : <span style={{color: 'var(--primary)'}}>{entry.amount}</span>
                            </span>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                          <span style={{color: 'var(--text-muted)'}}>{t.total}:</span>
                          <span style={{color: 'var(--primary)'}}>{bet.total_amount} MMK</span>
                        </div>

                        {/* Admin ဘက်က ရေးလိုက်တဲ့ Reason ပေါ်မည့်နေရာ */}
                        {bet.status === 'rejected' && bet.reason && (
                          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px', fontSize: '13px', marginTop: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>{t.rejectReason}:</strong>
                            {bet.reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="fade-in">
            <div className="header">
              <h1>{t.settingsTitle}</h1>
            </div>
            
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', marginLeft: '4px', textTransform: 'uppercase' }}>{t.preferences}</h3>
            <div className="card" style={{ padding: '10px 20px', marginBottom: '24px' }}>
              <div className="settings-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="settings-icon-bg" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
                    {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t.darkTheme}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isDarkMode ? 'On' : 'Off'}</div>
                  </div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={isDarkMode} onChange={e => setIsDarkMode(e.target.checked)} />
                  <span className="switch-track" />
                </label>
              </div>

              <div className="settings-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="settings-icon-bg" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
                    <Globe size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t.language}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lang === 'my' ? 'မြန်မာ' : 'English'}</div>
                  </div>
                </div>
                <div className="lang-btns no-select">
                  <button type="button" className={`lang-btn ${lang === 'my' ? 'active' : ''}`} onClick={() => setLang('my')}>မြန်မာ</button>
                  <button type="button" className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', marginLeft: '4px', textTransform: 'uppercase' }}>{t.profile}</h3>
            <div className="card" style={{ marginBottom: '24px' }}>
              <form onSubmit={handleUpdateName}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t.displayName}</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <UserCircle size={18} style={{ position: 'absolute', left: '10px', top: '14px', color: 'var(--text-muted)' }} />
                      <input type="text" className="form-input" style={{ paddingLeft: '36px' }} value={editName} onChange={e => setEditName(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary no-select" style={{ width: 'auto', padding: '0 20px' }} disabled={isUpdatingName}>
                      {isUpdatingName ? '...' : t.save}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>{t.nameHint}</p>
                </div>
              </form>
            </div>
            
            <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', marginLeft: '4px', textTransform: 'uppercase' }}>{t.account}</h3>
            <div className="card" style={{ padding: '10px 20px' }}>
              <div className="settings-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="settings-icon-bg" style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)' }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t.email}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>
                </div>
              </div>
              <div className="settings-item no-select" onClick={() => setShowLogoutConfirm(true)} style={{ cursor: 'pointer', borderBottom: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="settings-icon-bg" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <LogOut size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#ef4444' }}>{t.logout}</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        )}
      </div>

      <div className="bottom-nav no-select">
        <button type="button" className={`nav-item ${activeTab === 'submit' ? 'active' : ''}`} onClick={() => setActiveTab('submit')}>
          <Home size={22} />
          <span>{t.submitTab}</span>
        </button>
        <button type="button" className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Clock size={22} />
          <span>{t.historyTab}</span>
        </button>
        <button type="button" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={22} />
          <span>{t.settingsTab}</span>
        </button>
      </div>

      {/* SUBMIT MODAL */}
      {showConfirm && pendingPayload && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">{t.confirmTitle}</div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>{t.confirmDesc}</p>
              
              <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <p><strong>{t.type}:</strong> {pendingPayload.betting_type}</p>
                <p><strong>{t.session}:</strong> {pendingPayload.session === 'morning' ? t.morning : t.evening}</p>
                <p style={{ marginTop: '4px' }}><strong>{t.total}:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '16px' }}>{pendingPayload.total_amount} MMK</span></p>
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '4px 0' }}>
                <div className="bet-pill-container" style={{ margin: 0, border: 'none', background: 'transparent', padding: 0 }}>
                  {pendingPayload.betting_data.map((entry: any, i: number) => (
                    <span key={i} className="bet-pill" style={{ padding: '4px 10px', fontSize: '13px' }}>
                      {entry.number} : <span style={{color:'var(--primary)'}}>{entry.amount}</span>
                    </span>
                  ))}
                </div>
              </div>

            </div>
            <div className="modal-actions no-select">
              <button type="button" className="btn btn-primary" onClick={handleFinalSubmit}>{t.confirmBtn}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT MODAL */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle color="#ef4444" size={22} />
              {t.logoutConfirmTitle}
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)' }}>{t.logoutConfirmDesc}</p>
            </div>
            <div className="modal-actions no-select">
              <button type="button" className="btn btn-danger" onClick={executeLogout}>{t.logout}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
