import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import './App.css';

// သင့်ရဲ့ Backend API Worker URL ကို ဒီမှာ ပြောင်းထည့်ပေးပါ
const API_BASE_URL = 'https://betting-api-worker.sansoe5227.workers.dev'; 

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [customerName, setCustomerName] = useState('');
  const [bettingType, setBettingType] = useState('2D');
  const [session, setSession] = useState('morning');
  const [bettingData, setBettingData] = useState('');
  
  // List State
  const [myBets, setMyBets] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setCustomerName(currentUser.displayName || '');
        fetchMyBets(currentUser.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setMyBets([]);
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

  // ရိုးရှင်းသော ထိုးကြေး တွက်ချက်သည့် function
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
          if (isReverse) total += amount; // R ပါရင် အပြန်အတွက်ပါ ပေါင်းထည့်
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
      alert('Invalid betting data format. (e.g. "12 500")');
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
        alert('စာရင်းပေးပို့ခြင်း အောင်မြင်ပါသည်။ (Pending ပြနေပါမည်)');
        setBettingData('');
        fetchMyBets(user.uid); // Refresh the list
      } else {
        alert('ပေးပို့ခြင်း မအောင်မြင်ပါ။');
      }
    } catch (error) {
      alert('Network error.');
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;

  if (!user) {
    return (
      <div className="container login-screen">
        <h1 style={{ color: 'var(--primary)', marginBottom: '10px' }}>Customer App</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Please login to submit your lists.</p>
        <button className="btn btn-primary" onClick={handleLogin}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Welcome, {user.displayName}</h1>
        <button className="btn btn-outline" style={{ marginTop: '10px', padding: '8px' }} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>စာရင်းပေးပို့ရန် (Submit List)</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">နာမည် (Name)</label>
            <input 
              className="form-input" 
              value={customerName} 
              onChange={e => setCustomerName(e.target.value)} 
              required 
            />
          </div>

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
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ထိုးကြေးများ (ဥပမာ - 12 500)</label>
            <textarea 
              className="form-textarea" 
              rows={5} 
              value={bettingData} 
              onChange={e => setBettingData(e.target.value)} 
              placeholder="12 500&#10;34 1000R"
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary">ပေးပို့မည် (Submit)</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '16px' }}>ကျွန်ုပ်၏ မှတ်တမ်းများ (My Bets)</h2>
        {myBets.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>မှတ်တမ်း မရှိသေးပါ။</p>
        ) : (
          <div>
            {myBets.map(bet => (
              <div key={bet.id} className="bet-list-item">
                <div className="bet-header">
                  <span style={{ fontWeight: 'bold' }}>{bet.bet_date} ({bet.session})</span>
                  <span className={`badge ${bet.status}`}>{bet.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Type: {bet.betting_type} | Total: {bet.total_amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
