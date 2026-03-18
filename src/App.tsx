import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, updateProfile, User } from 'firebase/auth';
import { Home, Clock, Settings, LogOut, User as UserIcon, CheckCircle } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'https://betting-api-worker.sansoe5227.workers.dev'; 

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'settings'>('submit');
  
  // Form States
  const [customerName, setCustomerName] = useState('');
  const [bettingType, setBettingType] = useState('2D');
  const [session, setSession] = useState('morning');
  const [bettingData, setBettingData] = useState('');
  const [myBets, setMyBets] = useState<any[]>([]);

  // Settings State
  const [editName, setEditName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

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
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      alert('Login error');
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      signOut(auth);
      setMyBets([]);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editName.trim()) return;
    setIsUpdatingName(true);
    try {
      await updateProfile(user, { displayName: editName });
      setCustomerName(editName);
      alert('နာမည် ပြောင်းလဲခြင်း အောင်မြင်ပါသည်။');
    } catch (error) {
      alert('နာမည်ပြောင်းလဲခြင်း မအောင်မြင်ပါ။');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const fetchMyBets = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/my-bets?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setMyBets(data);
      }
    } catch (error) {
      console.error('Error fetching bets:', error);
    }
  };

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
          total += amount;
          if (isReverse) total += amount; 
        }
      }
    });
    return { total, entries };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bettingData.trim()) return;

    const { total, entries } = calculateTotal(bettingData);
    if (total === 0) {
      alert('ပုံစံမှားယွင်းနေပါသည်။ (ဥပမာ - 12 500)');
      return;
    }

    const payload = {
      id: `sub_${Date.now()}`,
      user_id: user.uid,
      customer_name: customerName,
      betting_type: bettingType,
      betting_data: entries,
      total_amount: total,
      session: session,
      bet_date: new Date().toISOString().split('T')[0],
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert('စာရင်းပေးပို့ခြင်း အောင်မြင်ပါသည်။');
        setBettingData('');
        fetchMyBets(user.uid); 
        setActiveTab('history'); // ပို့ပြီးရင် မှတ်တမ်းကို တန်းပြပေးမယ်
      } else {
        alert('ပေးပို့ခြင်း မအောင်မြင်ပါ။');
      }
    } catch (error) {
      alert('Network error.');
    }
  };

  // Helper to parse JSON betting data safely
  const parseBettingData = (data: any) => {
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return Array.isArray(data) ? data : [];
  };

  if (loading) return <div className="container"><p style={{textAlign: 'center', marginTop: 50}}>Loading...</p></div>;

  if (!user) {
    return (
      <div className="container login-screen">
        <h1 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Lucky 2D/3D</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>စာရင်းပေးပို့ရန် Google အကောင့်ဖြင့် ဝင်ပါ။</p>
        <button className="btn btn-primary" onClick={handleLogin}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="container">
        {/* TAB 1: SUBMIT LIST */}
        {activeTab === 'submit' && (
          <div className="fade-in">
            <div className="header">
              <h1>စာရင်းပေးပို့ရန်</h1>
              <p style={{color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px'}}>Hello, {customerName}</p>
            </div>
            <div className="card">
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">အမျိုးအစား</label>
                    <select className="form-select" value={bettingType} onChange={e => setBettingType(e.target.value)}>
                      <option value="2D">2D</option>
                      <option value="3D">3D</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">အချိန် (Session)</label>
                    <select className="form-select" value={session} onChange={e => setSession(e.target.value)}>
                      <option value="morning">Morning (မနက်)</option>
                      <option value="evening">Evening (ညနေ)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ထိုးကြေးများ (ဥပမာ - 12 500)</label>
                  <textarea 
                    className="form-textarea" 
                    rows={6} 
                    value={bettingData} 
                    onChange={e => setBettingData(e.target.value)} 
                    placeholder="12 500&#10;34 1000R"
                    required 
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle size={18} /> ပေးပို့မည် (Submit)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: MY BETS (HISTORY) */}
        {activeTab === 'history' && (
          <div className="fade-in">
            <div className="header">
              <h1>ကျွန်ုပ်၏ မှတ်တမ်းများ</h1>
            </div>
            <div className="card">
              {myBets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
                  <Clock size={40} style={{ opacity: 0.5, marginBottom: 10 }} />
                  <p>မှတ်တမ်း မရှိသေးပါ။</p>
                </div>
              ) : (
                <div>
                  {myBets.map(bet => {
                    const entries = parseBettingData(bet.betting_data);
                    return (
                      <div key={bet.id} className="bet-list-item">
                        <div className="bet-header">
                          <div>
                            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{bet.bet_date}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px', marginLeft: '6px' }}>({bet.session})</span>
                          </div>
                          <span className={`badge ${bet.status}`}>{bet.status}</span>
                        </div>
                        
                        {/* ဂဏန်းများကို အသေးစိတ်ပြသော နေရာ */}
                        <div className="bet-pill-container">
                          {entries.map((entry: any, i: number) => (
                            <span key={i} className="bet-pill">
                              {entry.number} : <span style={{color: 'var(--primary)'}}>{entry.amount}</span>
                            </span>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '14px', fontWeight: 'bold', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                          <span>{bet.betting_type} Total:</span>
                          <span style={{color: 'var(--primary)'}}>{bet.total_amount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="fade-in">
            <div className="header">
              <h1>Settings</h1>
            </div>
            <div className="card">
              <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Profile</h3>
              <form onSubmit={handleUpdateName}>
                <div className="form-group">
                  <label className="form-label">သင့်အမည် (Display Name)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <UserIcon size={18} style={{ position: 'absolute', left: '10px', top: '14px', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '36px' }}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 16px' }} disabled={isUpdatingName}>
                      {isUpdatingName ? '...' : 'Save'}
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>ဒီနာမည်ကို Admin ဘက်မှာ မြင်ရပါမည်။</p>
                </div>
              </form>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '24px 0' }} />
              
              <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Account</h3>
              <button className="btn btn-danger" onClick={handleLogout}>
                <LogOut size={18} /> အကောင့်ထွက်မည် (Logout)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION */}
      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === 'submit' ? 'active' : ''}`} onClick={() => setActiveTab('submit')}>
          <Home size={22} />
          <span>Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <Clock size={22} />
          <span>My Bets</span>
        </button>
        <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={22} />
          <span>Settings</span>
        </button>
      </div>
    </>
  );
}
