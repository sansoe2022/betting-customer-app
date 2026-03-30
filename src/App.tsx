import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, getRedirectResult, onAuthStateChanged, signOut, updateProfile, User } from 'firebase/auth';
import { Home, Clock, Settings, LogOut, CheckCircle, UserCircle, Calendar, Sun, Moon, Globe, Mail, AlertTriangle, RefreshCw, Edit2, Trophy, Search } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'https://betting-api-worker.sansoe5227.workers.dev'; 

const translations = {
  en: {
    submitTab: "Submit", historyTab: "My Bets", winnersTab: "Winners", settingsTab: "Settings",
    title: "Submit List", hello: "Hello", type: "Type", session: "Session", morning: "Morning", evening: "Evening",
    betsLabel: "Bets", submitBtn: "Submit",
    historyTitle: "My History", noRecords: "No records found.", total: "Total", totalLists: "Total Lists",
    winnersTitle: "Check Winners", winningNumber: "Winning Number", searchBtn: "Check", 
    winAmount: "Total Win Amount", noWinners: "No winners found for this number.",
    settingsTitle: "Settings", profile: "Profile", displayName: "Display Name", 
    nameHint: "This name will be visible to Admin.", save: "Save",
    account: "Account", email: "Connected Email", logout: "Logout",
    preferences: "Preferences", darkTheme: "Dark Theme", language: "Language",
    confirmTitle: "Confirm Submission", confirmDesc: "Please review your list before submitting.",
    cancel: "Cancel", confirmBtn: "Confirm & Send",
    logoutConfirmTitle: "Confirm Logout", logoutConfirmDesc: "Are you sure you want to log out?",
    rejectReason: "Reason for rejection",
    editResubmit: "Edit & Resubmit", editList: "Edit List", cancelEdit: "Cancel Edit",
    customerName: "Customer Name", paymentType: "Payment Type", cash: "Cash", credit: "Credit"
  },
  my: {
    submitTab: "စာရင်းပို့ရန်", historyTab: "မှတ်တမ်း", winnersTab: "ပေါက်ဂဏန်း", settingsTab: "ဆက်တင်",
    title: "စာရင်းပေးပို့ရန်", hello: "မင်္ဂလာပါ", type: "အမျိုးအစား", session: "အချိန်", morning: "မနက်ပိုင်း", evening: "ညနေပိုင်း",
    betsLabel: "ထိုးကြေးများ", submitBtn: "ပေးပို့မည်",
    historyTitle: "ကျွန်ုပ်၏ မှတ်တမ်းများ", noRecords: "မှတ်တမ်း မရှိသေးပါ။", total: "စုစုပေါင်း", totalLists: "စာရင်းစောင်ရေ",
    winnersTitle: "ပေါက်ဂဏန်း စစ်ရန်", winningNumber: "ထွက်ဂဏန်း ရိုက်ထည့်ပါ", searchBtn: "စစ်ဆေးမည်", 
    winAmount: "စုစုပေါင်း ပေါက်ကြေး", noWinners: "ဒီဂဏန်းနဲ့ ပတ်သက်ပြီး ပေါက်မထားပါ။",
    settingsTitle: "ဆက်တင်များ", profile: "ပရိုဖိုင်", displayName: "သင့်အမည် (Display Name)", 
    nameHint: "ဒီနာမည်ကို Admin ဘက်မှာ မြင်ရပါမည်။", save: "သိမ်းမည်",
    account: "အကောင့်", email: "ချိတ်ဆက်ထားသော အီးမေးလ်", logout: "အကောင့်ထွက်မည်",
    preferences: "အပြင်အဆင်များ", darkTheme: "အမှောင်မြင်ကွင်း", language: "ဘာသာစကား",
    confirmTitle: "စာရင်းအတည်ပြုရန်", confirmDesc: "မပို့မီ အောက်ပါအချက်အလက်များကို သေချာစစ်ဆေးပါ။",
    cancel: "ပယ်ဖျက်မည်", confirmBtn: "အတည်ပြုပြီး ပို့မည်",
    logoutConfirmTitle: "အကောင့်ထွက်ရန်", logoutConfirmDesc: "အကောင့်မှ ထွက်မှာ သေချာပါသလား?",
    rejectReason: "ပယ်ဖျက်ရသည့် အကြောင်းရင်း",
    editResubmit: "ပြင်ဆင်ပြီး ပြန်ပို့မည်", editList: "စာရင်း ပြင်ဆင်ရန်", cancelEdit: "ပယ်ဖျက်မည်",
    customerName: "ထိုးသူအမည် (Local)", paymentType: "ငွေချေစနစ်", cash: "လက်ငင်း", credit: "အကြွေး"
  }
};

// Local Storage Helper
const getLocalMeta = () => JSON.parse(localStorage.getItem('local_bet_meta') || '{}');
const saveLocalMeta = (id: string, name: string, paymentType: string) => {
  const meta = getLocalMeta();
  meta[id] = { name, paymentType };
  localStorage.setItem('local_bet_meta', JSON.stringify(meta));
};

const parseBettingData = (data: any) => {
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return []; } }
  return Array.isArray(data) ? data : [];
};

// ==========================================
// 1. SUBMIT PAGE COMPONENT
// ==========================================
function SubmitPage({ user, t, lang, showToast, onSuccess }: any) {
  const currentHour = new Date().getHours();
  const autoSession = currentHour < 12 ? 'morning' : 'evening';
  const [bettingType, setBettingType] = useState<'2D' | '3D'>('2D');
  const [session, setSession] = useState(autoSession);
  const [bettingData, setBettingData] = useState('');
  
  // Local သိမ်းမည့် State များ
  const [localName, setLocalName] = useState('');
  const [localPaymentType, setLocalPaymentType] = useState<'cash' | 'credit'>('cash');

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

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
              for (let i = 0; i < str.length; i++) getPerms(str.slice(0, i) + str.slice(i + 1), prefix + str[i]);
            };
            getPerms(number);
            total += amount * perms.size;
          } else { total += amount; }
        }
      }
    });
    return { total, entries };
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bettingData.trim()) return;

    const { total, entries } = calculateTotal(bettingData);
    if (total === 0) { alert(lang === 'my' ? 'ပုံစံမှားယွင်းနေပါသည်။' : 'Invalid format.'); return; }

    setPendingPayload({
      id: `sub_${Date.now()}`, user_id: user.uid, customer_name: user.displayName || 'Unknown',
      betting_type: bettingType, betting_data: entries, total_amount: total, session: session, bet_date: new Date().toISOString().split('T')[0],
    });
    setShowConfirm(true); 
  };

  const handleFinalSubmit = async () => {
    if (!pendingPayload) return;
    setShowConfirm(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingPayload), });
      if (response.ok) {
        // Admin သို့ပို့ပြီးပါက Local တွင် နာမည်နှင့် ငွေချေစနစ်ကို သိမ်းမည်
        saveLocalMeta(pendingPayload.id, localName || 'Unknown', localPaymentType);
        
        showToast(lang === 'my' ? 'စာရင်းပေးပို့ခြင်း အောင်မြင်ပါသည်။' : 'Submitted successfully!');
        setBettingData(''); setLocalName(''); setLocalPaymentType('cash'); onSuccess(); 
      } else { alert('Failed to submit.'); }
    } catch (error) { alert('Network error.'); }
  };

  const placeholderHint = bettingType === '2D' ? (lang === 'my' ? "ဥပမာ - 12 500\n34 1000R" : "e.g., 12 500\n34 1000R") : (lang === 'my' ? "ဥပမာ - 123 500\n456 1000R" : "e.g., 123 500\n456 1000R");

  return (
    <div className="fade-in">
      <div className="header"><h1>{t.title}</h1><p style={{color: 'var(--text-muted)', fontSize: '14px', marginTop: '5px'}}>{t.hello}, <span style={{fontWeight: 'bold', color: 'var(--primary)'}}>{user.displayName}</span></p></div>
      <div className="card">
        <form onSubmit={handlePreSubmit}>
          <div className="form-group">
            <label className="form-label">{t.customerName}</label>
            <input type="text" className="form-input" value={localName} onChange={e => setLocalName(e.target.value)} placeholder="e.g. Ko Aung" />
          </div>
          <div className="form-group">
            <label className="form-label">{t.paymentType}</label>
            <div className="toggle-group no-select">
              <button type="button" className={`toggle-btn ${localPaymentType === 'cash' ? 'active' : ''}`} onClick={() => setLocalPaymentType('cash')}>{t.cash}</button>
              <button type="button" className={`toggle-btn ${localPaymentType === 'credit' ? 'active' : ''}`} onClick={() => setLocalPaymentType('credit')}>{t.credit}</button>
            </div>
          </div>
          <div className="form-group"><label className="form-label">{t.type}</label><div className="toggle-group no-select"><button type="button" className={`toggle-btn ${bettingType === '2D' ? 'active' : ''}`} onClick={() => setBettingType('2D')}>2D (00-99)</button><button type="button" className={`toggle-btn ${bettingType === '3D' ? 'active' : ''}`} onClick={() => setBettingType('3D')}>3D (000-999)</button></div></div>
          <div className="form-group"><label className="form-label">{t.session}</label><div className="toggle-group no-select"><button type="button" className={`toggle-btn ${session === 'morning' ? 'active' : ''}`} onClick={() => setSession('morning')}><Sun size={14}/> {t.morning}</button><button type="button" className={`toggle-btn ${session === 'evening' ? 'active' : ''}`} onClick={() => setSession('evening')}><Moon size={14}/> {t.evening}</button></div></div>
          <div className="form-group"><label className="form-label">{t.betsLabel}</label><textarea className="form-textarea" rows={6} value={bettingData} onChange={e => setBettingData(e.target.value)} placeholder={placeholderHint} required /></div>
          <button type="submit" className="btn btn-primary no-select"><CheckCircle size={18} /> {t.submitBtn}</button>
        </form>
      </div>

      {showConfirm && pendingPayload && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">{t.confirmTitle}</div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>{t.confirmDesc}</p>
              <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <p><strong>{t.customerName}:</strong> {localName || 'Unknown'}</p><p><strong>{t.type}:</strong> {pendingPayload.betting_type}</p><p><strong>{t.session}:</strong> {pendingPayload.session === 'morning' ? t.morning : t.evening}</p><p style={{ marginTop: '4px' }}><strong>{t.total}:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '16px' }}>{pendingPayload.total_amount} MMK</span></p>
              </div>
              <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '4px 0' }}>
                <div className="bet-pill-container" style={{ margin: 0, border: 'none', background: 'transparent', padding: 0 }}>
                  {pendingPayload.betting_data.map((entry: any, i: number) => <span key={i} className="bet-pill" style={{ padding: '4px 10px', fontSize: '13px' }}>{entry.number} : <span style={{color:'var(--primary)'}}>{entry.amount}</span></span>)}
                </div>
              </div>
            </div>
            <div className="modal-actions no-select"><button type="button" className="btn btn-primary" onClick={handleFinalSubmit}>{t.confirmBtn}</button><button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>{t.cancel}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. MY BETS (HISTORY) PAGE COMPONENT
// ==========================================
function MyBetsPage({ user, myBets, fetchMyBets, isRefreshing, t, lang, showToast }: any) {
  const currentHour = new Date().getHours();
  const autoSession = currentHour < 12 ? 'morning' : 'evening';
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historySession, setHistorySession] = useState(autoSession);

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  
  const [editLocalName, setEditLocalName] = useState('');
  const [editLocalPaymentType, setEditLocalPaymentType] = useState<'cash'|'credit'>('cash');
  const [editType, setEditType] = useState<'2D' | '3D'>('2D');
  const [editSession, setEditSession] = useState('morning');
  const [editData, setEditData] = useState('');
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

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
              for (let i = 0; i < str.length; i++) getPerms(str.slice(0, i) + str.slice(i + 1), prefix + str[i]);
            };
            getPerms(number);
            total += amount * perms.size;
          } else { total += amount; }
        }
      }
    });
    return { total, entries };
  };

  const openEditSheet = (bet: any) => {
    const meta = getLocalMeta()[bet.id] || { name: '', paymentType: 'cash' };
    setEditLocalName(meta.name); setEditLocalPaymentType(meta.paymentType);
    setEditingBetId(bet.id); setEditType(bet.betting_type); setEditSession(bet.session);
    const parsed = parseBettingData(bet.betting_data);
    const text = parsed.map((b: any) => `${b.number} ${b.amount}`).join('\n');
    setEditData(text); setShowEditSheet(true); 
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { total, entries } = calculateTotal(editData);
    if (total === 0) { alert(lang === 'my' ? 'ပုံစံမှားယွင်းနေပါသည်။' : 'Invalid format.'); return; }
    setPendingPayload({
      id: editingBetId, user_id: user.uid, customer_name: user.displayName,
      betting_type: editType, betting_data: entries, total_amount: total,
      session: editSession, bet_date: new Date().toISOString().split('T')[0],
    });
    setShowEditSheet(false); setTimeout(() => setShowConfirm(true), 100);
  };

  const handleFinalSubmit = async () => {
    if (!pendingPayload) return;
    setShowConfirm(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/${editingBetId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingPayload), });
      if (response.ok) {
        saveLocalMeta(pendingPayload.id, editLocalName || 'Unknown', editLocalPaymentType);
        showToast(lang === 'my' ? 'စာရင်းပေးပို့ခြင်း အောင်မြင်ပါသည်။' : 'Submitted successfully!');
        setEditingBetId(null); setEditData(''); fetchMyBets(true);
      } else { alert('Failed to submit.'); }
    } catch (error) { alert('Network error.'); }
  };

  const filteredBets = myBets.filter((bet: any) => bet.bet_date === historyDate && bet.session === historySession);
  const totalFilteredAmount = filteredBets.reduce((sum: number, bet: any) => sum + bet.total_amount, 0);
  const totalLists = filteredBets.length;

  return (
    <div className="fade-in">
      <div className="header" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0 }}>{t.historyTitle}</h1>
        <button onClick={() => fetchMyBets(true)} className="no-select" style={{ position: 'absolute', right: '0', background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px' }}><RefreshCw size={22} className={isRefreshing ? 'spin-anim' : ''} /></button>
      </div>

      <div className="date-bar">
        <div className="date-btn no-select"><Calendar size={15} /> <span>{historyDate}</span><input type="date" value={historyDate} onChange={(e) => { if (e.target.value) setHistoryDate(e.target.value); }} style={{ position: 'absolute', opacity: 0, left: 0, top: 0, width: '100%', height: '100%', cursor: 'pointer' }} /></div>
      </div>
      <div className="toggle-group no-select" style={{ marginBottom: '16px' }}>
        <button type="button" className={`toggle-btn ${historySession === 'morning' ? 'active' : ''}`} onClick={() => setHistorySession('morning')}><Sun size={14} /> {t.morning}</button>
        <button type="button" className={`toggle-btn ${historySession === 'evening' ? 'active' : ''}`} onClick={() => setHistorySession('evening')}><Moon size={14} /> {t.evening}</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">{t.totalLists}</div><div className="stat-value">{totalLists}</div></div>
        <div className="stat-card"><div className="stat-label">{t.total}</div><div className="stat-value">{totalFilteredAmount.toLocaleString()}</div></div>
      </div>

      <div>
        {filteredBets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}><Clock size={40} style={{ opacity: 0.5, marginBottom: 10, margin: '0 auto' }} /><p>{t.noRecords}</p></div>
        ) : (
          <div>
            {filteredBets.map((bet: any) => {
              const entries = parseBettingData(bet.betting_data);
              const meta = getLocalMeta()[bet.id] || { name: 'Unknown', paymentType: 'cash' };

              return (
                <div key={bet.id} className="bet-list-card">
                  <div className="bet-header">
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{meta.name}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <span className={`badge ${bet.betting_type === '2D' ? 'badge-accent' : 'badge-info'}`}>{bet.betting_type}</span>
                        <span className={`badge ${meta.paymentType === 'cash' ? 'badge-success' : 'badge-warning'}`}>{meta.paymentType === 'cash' ? t.cash : t.credit}</span>
                        <span className={`badge ${bet.status}`}>{bet.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bet-pill-container">{entries.map((entry: any, i: number) => <span key={i} className="bet-pill">{entry.number} : <span style={{color: 'var(--primary)'}}>{entry.amount}</span></span>)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '15px', fontWeight: 'bold' }}>
                    <span style={{color: 'var(--text-muted)'}}>{t.total}</span><span style={{color: 'var(--primary)'}}>{bet.total_amount.toLocaleString()} MMK</span>
                  </div>

                  {bet.status === 'rejected' && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      {bet.reason && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}><strong style={{ display: 'block', marginBottom: '4px' }}>{t.rejectReason}:</strong>{bet.reason}</div>}
                      <button type="button" className="btn btn-primary no-select" style={{ background: '#3b82f6' }} onClick={() => openEditSheet(bet)}><Edit2 size={16} /> {t.editResubmit}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEditSheet && (
        <div className="bottom-sheet-overlay" onClick={() => setShowEditSheet(false)}>
          <div className="bottom-sheet-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--text-main)' }}>{t.editList}</h2>
            <form onSubmit={handlePreSubmit}>
              <div className="form-group"><label className="form-label">{t.customerName}</label><input type="text" className="form-input" value={editLocalName} onChange={e => setEditLocalName(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{t.paymentType}</label><div className="toggle-group no-select"><button type="button" className={`toggle-btn ${editLocalPaymentType === 'cash' ? 'active' : ''}`} onClick={() => setEditLocalPaymentType('cash')}>{t.cash}</button><button type="button" className={`toggle-btn ${editLocalPaymentType === 'credit' ? 'active' : ''}`} onClick={() => setEditLocalPaymentType('credit')}>{t.credit}</button></div></div>
              <div className="form-group"><label className="form-label">{t.type}</label><div className="toggle-group no-select"><button type="button" className={`toggle-btn ${editType === '2D' ? 'active' : ''}`} onClick={() => setEditType('2D')}>2D</button><button type="button" className={`toggle-btn ${editType === '3D' ? 'active' : ''}`} onClick={() => setEditType('3D')}>3D</button></div></div>
              <div className="form-group"><label className="form-label">{t.session}</label><div className="toggle-group no-select"><button type="button" className={`toggle-btn ${editSession === 'morning' ? 'active' : ''}`} onClick={() => setEditSession('morning')}><Sun size={14}/> {t.morning}</button><button type="button" className={`toggle-btn ${editSession === 'evening' ? 'active' : ''}`} onClick={() => setEditSession('evening')}><Moon size={14}/> {t.evening}</button></div></div>
              <div className="form-group"><label className="form-label">{t.betsLabel}</label><textarea className="form-textarea" rows={5} value={editData} onChange={e => setEditData(e.target.value)} required /></div>
              <div style={{ display: 'flex', gap: '10px' }}><button type="button" className="btn btn-secondary no-select" onClick={() => setShowEditSheet(false)}>{t.cancel}</button><button type="submit" className="btn btn-primary no-select">{t.submitBtn}</button></div>
            </form>
          </div>
        </div>
      )}

      {showConfirm && pendingPayload && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-title">{t.confirmTitle}</div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>{t.confirmDesc}</p>
              <div style={{ background: 'var(--bg-color)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                <p><strong>{t.customerName}:</strong> {editLocalName || 'Unknown'}</p><p><strong>{t.type}:</strong> {pendingPayload.betting_type}</p><p><strong>{t.session}:</strong> {pendingPayload.session === 'morning' ? t.morning : t.evening}</p><p style={{ marginTop: '4px' }}><strong>{t.total}:</strong> <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '16px' }}>{pendingPayload.total_amount} MMK</span></p>
              </div>
            </div>
            <div className="modal-actions no-select"><button type="button" className="btn btn-primary" onClick={handleFinalSubmit}>{t.confirmBtn}</button><button type="button" className="btn btn-secondary" onClick={() => { setShowConfirm(false); setShowEditSheet(true); }}>{t.cancel}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. WINNERS PAGE COMPONENT (Admin ပုံစံ Name List ဖြင့်ပြမည်)
// ==========================================
function WinnersPage({ myBets, t, lang }: any) {
  const currentHour = new Date().getHours();
  const autoSession = currentHour < 12 ? 'morning' : 'evening';
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [historySession, setHistorySession] = useState(autoSession);
  const [bettingType, setBettingType] = useState<'2D' | '3D'>('2D');
  const [winningNumber, setWinningNumber] = useState('');
  const [searched, setSearched] = useState(false);
  const [winnersList, setWinnersList] = useState<any[]>([]);

  const handleSearch = () => {
    if (!winningNumber.trim()) return;
    const numStr = winningNumber.trim();
    const isValid = bettingType === '2D' ? /^\d{2}$/.test(numStr) : /^\d{3}$/.test(numStr);
    
    if (!isValid) { alert(bettingType === '2D' ? 'Enter valid 2D (00-99)' : 'Enter valid 3D (000-999)'); return; }

    const filteredBets = myBets.filter((bet: any) => bet.bet_date === historyDate && bet.session === historySession && bet.betting_type === bettingType && bet.status === 'approved');
    const localMeta = getLocalMeta();
    const list: any[] = [];

    filteredBets.forEach((bet: any) => {
      const parsed = parseBettingData(bet.betting_data);
      let wonAmount = 0;
      parsed.forEach((entry: any) => {
        const enNum = String(entry.number);
        const enAmtStr = String(entry.amount).toUpperCase();
        const isReverse = enAmtStr.includes('R');
        const pureAmount = parseInt(enAmtStr.replace('R', '')) || 0;

        if (enNum === numStr) { wonAmount += pureAmount; }
        if (isReverse && enNum.length >= 2) {
          const perms = new Set<string>();
          const getPerms = (str: string, prefix = '') => {
            if (str.length === 0) perms.add(prefix);
            for (let i = 0; i < str.length; i++) getPerms(str.slice(0, i) + str.slice(i + 1), prefix + str[i]);
          };
          getPerms(enNum);
          if (perms.has(numStr) && numStr !== enNum) { wonAmount += pureAmount; }
        }
      });

      if (wonAmount > 0) {
        list.push({ bet, meta: localMeta[bet.id] || { name: 'Unknown', paymentType: 'cash' }, wonAmount });
      }
    });

    setWinnersList(list);
    setSearched(true);
  };

  return (
    <div className="fade-in">
      <div className="header"><h1>{t.winnersTitle}</h1></div>

      <div className="date-bar">
        <div className="date-btn no-select">
          <Calendar size={15} /> <span>{historyDate}</span>
          <input type="date" value={historyDate} onChange={(e) => { if (e.target.value) { setHistoryDate(e.target.value); setSearched(false); } }} style={{ position: 'absolute', opacity: 0, left: 0, top: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
        </div>
      </div>
      <div className="toggle-group no-select" style={{ marginBottom: '16px' }}>
        <button type="button" className={`toggle-btn ${historySession === 'morning' ? 'active' : ''}`} onClick={() => { setHistorySession('morning'); setSearched(false); }}><Sun size={14} /> {t.morning}</button>
        <button type="button" className={`toggle-btn ${historySession === 'evening' ? 'active' : ''}`} onClick={() => { setHistorySession('evening'); setSearched(false); }}><Moon size={14} /> {t.evening}</button>
      </div>

      <div className="card">
        <div className="form-group"><label className="form-label">{t.type}</label><div className="toggle-group no-select"><button type="button" className={`toggle-btn ${bettingType === '2D' ? 'active' : ''}`} onClick={() => { setBettingType('2D'); setSearched(false); setWinningNumber(''); }}>2D (00-99)</button><button type="button" className={`toggle-btn ${bettingType === '3D' ? 'active' : ''}`} onClick={() => { setBettingType('3D'); setSearched(false); setWinningNumber(''); }}>3D (000-999)</button></div></div>
        <div className="form-group">
          <label className="form-label">{t.winningNumber}</label>
          <div className="search-box">
            <Search size={18} />
            <input className="form-input" style={{ paddingLeft: '40px' }} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={bettingType === '2D' ? 2 : 3} value={winningNumber} onChange={e => setWinningNumber(e.target.value.replace(/\D/g, ''))} placeholder={bettingType === '2D' ? '00-99' : '000-999'} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
        </div>
        <button type="button" className="btn btn-primary no-select" onClick={handleSearch}><Search size={18} /> {t.searchBtn}</button>
      </div>

      {searched && (
        <div>
          {winnersList.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <Trophy size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>No winners found</h3>
              <p style={{ color: 'var(--text-muted)' }}>{t.noWinners}</p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-main)' }}>{winnersList.length} winner{winnersList.length > 1 ? 's' : ''} for #{winningNumber}</p>
              {winnersList.map((w, idx) => (
                <div key={idx} className="bet-list-card">
                  <div className="bet-header">
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{w.meta.name}</div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <span className={`badge ${w.bet.betting_type === '2D' ? 'badge-accent' : 'badge-info'}`}>{w.bet.betting_type}</span>
                        <span className={`badge ${w.meta.paymentType === 'cash' ? 'badge-success' : 'badge-warning'}`}>{w.meta.paymentType === 'cash' ? t.cash : t.credit}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '15px', fontWeight: 'bold' }}>
                    <span style={{color: 'var(--text-muted)'}}>Bet on #{winningNumber}:</span>
                    <span style={{color: 'var(--primary)'}}>{w.wonAmount.toLocaleString()} MMK</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. SETTINGS PAGE COMPONENT
// ==========================================
function SettingsPage({ user, t, lang, setLang, isDarkMode, setIsDarkMode, showToast, onLogout }: any) {
  const [editName, setEditName] = useState(user.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editName.trim()) return;
    setIsUpdatingName(true);
    try { await updateProfile(user, { displayName: editName }); showToast(lang === 'my' ? 'နာမည် ပြောင်းလဲခြင်း အောင်မြင်ပါသည်။' : 'Name updated successfully!'); } 
    catch (error) { alert('Error updating name.'); } finally { setIsUpdatingName(false); }
  };

  return (
    <div className="fade-in">
      <div className="header"><h1>{t.settingsTitle}</h1></div>
      <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', marginLeft: '4px', textTransform: 'uppercase' }}>{t.preferences}</h3>
      <div className="card" style={{ padding: '10px 20px', marginBottom: '24px' }}>
        <div className="settings-item"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div className="settings-icon-bg" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>{isDarkMode ? <Moon size={18} /> : <Sun size={18} />}</div><div><div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t.darkTheme}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{isDarkMode ? 'On' : 'Off'}</div></div></div><label className="switch"><input type="checkbox" checked={isDarkMode} onChange={e => setIsDarkMode(e.target.checked)} /><span className="switch-track" /></label></div>
        <div className="settings-item"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div className="settings-icon-bg" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}><Globe size={18} /></div><div><div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t.language}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lang === 'my' ? 'မြန်မာ' : 'English'}</div></div></div><div className="lang-btns no-select"><button type="button" className={`lang-btn ${lang === 'my' ? 'active' : ''}`} onClick={() => setLang('my')}>မြန်မာ</button><button type="button" className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button></div></div>
      </div>

      <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', marginLeft: '4px', textTransform: 'uppercase' }}>{t.profile}</h3>
      <div className="card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleUpdateName}><div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">{t.displayName}</label><div style={{ display: 'flex', gap: '8px' }}><div style={{ position: 'relative', flex: 1 }}><UserCircle size={18} style={{ position: 'absolute', left: '10px', top: '14px', color: 'var(--text-muted)' }} /><input type="text" className="form-input" style={{ paddingLeft: '36px' }} value={editName} onChange={e => setEditName(e.target.value)} required /></div><button type="submit" className="btn btn-primary no-select" style={{ width: 'auto', padding: '0 20px' }} disabled={isUpdatingName}>{isUpdatingName ? '...' : t.save}</button></div><p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>{t.nameHint}</p></div></form>
      </div>
      
      <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', marginLeft: '4px', textTransform: 'uppercase' }}>{t.account}</h3>
      <div className="card" style={{ padding: '10px 20px' }}>
        <div className="settings-item"><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div className="settings-icon-bg" style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)' }}><Mail size={18} /></div><div><div style={{ fontWeight: 'bold', fontSize: '15px' }}>{t.email}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.email}</div></div></div></div>
        <div className="settings-item no-select" onClick={() => setShowLogoutConfirm(true)} style={{ cursor: 'pointer', borderBottom: 'none' }}><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div className="settings-icon-bg" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}><LogOut size={18} /></div><div><div style={{ fontWeight: 'bold', fontSize: '15px', color: '#ef4444' }}>{t.logout}</div></div></div></div>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay"><div className="modal-content"><div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle color="#ef4444" size={22} />{t.logoutConfirmTitle}</div><div className="modal-body"><p style={{ color: 'var(--text-muted)' }}>{t.logoutConfirmDesc}</p></div><div className="modal-actions no-select"><button type="button" className="btn btn-danger" onClick={onLogout}>{t.logout}</button><button type="button" className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>{t.cancel}</button></div></div></div>
      )}
    </div>
  );
}

// ==========================================
// 5. MAIN APP COMPONENT
// ==========================================
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'winners' | 'settings'>('submit');
  
  const [lang, setLang] = useState<'en' | 'my'>(() => (localStorage.getItem('app_lang') as 'en' | 'my') || 'en');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_dark_mode') === 'true');
  const t = translations[lang];
  const [toastMsg, setToastMsg] = useState('');
  
  const [myBets, setMyBets] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMyBets = async (showSpin = false) => {
    if (!user) return;
    if (showSpin) setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions/my-bets?user_id=${user.uid}`);
      if (response.ok) { const data = await response.json(); setMyBets(data); }
    } catch (error) { console.error('Error fetching bets:', error); } 
    finally { if (showSpin) setIsRefreshing(false); }
  };

  useEffect(() => {
    if (user) {
      fetchMyBets(true);
      const interval = setInterval(() => { if (document.visibilityState === 'visible') fetchMyBets(false); }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  useEffect(() => { localStorage.setItem('app_lang', lang); }, [lang]);
  useEffect(() => {
    localStorage.setItem('app_dark_mode', String(isDarkMode));
    if (isDarkMode) document.body.classList.add('dark'); else document.body.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    getRedirectResult(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setLoading(false); });
    return () => unsubscribe();
  }, []);

    const handleLogin = async () => { 
    try { 
      await signInWithPopup(auth, googleProvider); 
    } catch (error) { 
      alert('Login error. Please try again.'); 
      console.error(error);
    } 
  };

  const executeLogout = () => { signOut(auth); setMyBets([]); };

  if (loading) return <div className="container"><p style={{textAlign: 'center', marginTop: 50}}>Loading...</p></div>;

  if (!user) {
    return (
      <div className="container login-screen">
        <h1 style={{ color: 'var(--primary)', marginBottom: '10px', fontSize: '28px' }}>Lucky 2D/3D</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Sign in to submit your list.</p>
        <button className="btn btn-primary no-select" onClick={handleLogin}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <>
      {toastMsg && <div className="toast-container"><CheckCircle size={18} /> {toastMsg}</div>}

      <div className="container">
        {activeTab === 'submit' && <SubmitPage user={user} t={t} lang={lang} showToast={showToast} onSuccess={() => setActiveTab('history')} />}
        {activeTab === 'history' && <MyBetsPage user={user} myBets={myBets} fetchMyBets={fetchMyBets} isRefreshing={isRefreshing} t={t} lang={lang} showToast={showToast} />}
        {activeTab === 'winners' && <WinnersPage myBets={myBets} t={t} lang={lang} />}
        {activeTab === 'settings' && <SettingsPage user={user} t={t} lang={lang} setLang={setLang} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} showToast={showToast} onLogout={executeLogout} />}
      </div>

      <div className="bottom-nav no-select">
        <button type="button" className={`nav-item ${activeTab === 'submit' ? 'active' : ''}`} onClick={() => setActiveTab('submit')}><Home size={22} /><span>{t.submitTab}</span></button>
        <button type="button" className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><Clock size={22} /><span>{t.historyTab}</span></button>
        <button type="button" className={`nav-item ${activeTab === 'winners' ? 'active' : ''}`} onClick={() => setActiveTab('winners')}><Trophy size={22} /><span>{t.winnersTab}</span></button>
        <button type="button" className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={22} /><span>{t.settingsTab}</span></button>
      </div>
    </>
  );
}
