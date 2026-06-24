import { useState, useEffect, useRef } from "react";

const SUPA_URL = "https://iixubpzwizcdpecgwrhe.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpeHVicHp3aXpjZHBlY2d3cmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDEyMjgsImV4cCI6MjA5NzcxNzIyOH0.zbquShDwFMLDjBP2tETskYpGHa39It8H0QKJIr1tNRE";

const supa = {
  async get(table) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?order=created_at.desc`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async update(table, id, data) {
    const r = await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(data)
    });
    return r.json();
  },
  async delete(table, id) {
    await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
  },
  async auth(email, password, action = "signin") {
    const endpoint = action === "signup"
      ? `${SUPA_URL}/auth/v1/signup`
      : `${SUPA_URL}/auth/v1/token?grant_type=password`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    return r.json();
  }
};

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtDate = d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateShort = d => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const fmtCur = n => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtTime12 = t => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
};
const addDays = (dateStr, n) => { const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; };
const startOfWeek = (dateStr) => { const d = new Date(dateStr); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; };
const monthLabel = (dateStr) => new Date(dateStr).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const isSameMonth = (dateStr, ref) => { const d = new Date(dateStr), r = new Date(ref); return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth(); };
const daysInMonthGrid = (dateStr) => {
  const d = new Date(dateStr);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) { const cell = new Date(gridStart); cell.setDate(cell.getDate() + i); cells.push(cell.toISOString().split("T")[0]); }
  return cells;
};
const calcBill = (items, discount) => {
  const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = items.reduce((s, i) => s + (i.price * i.qty * i.gst / 100), 0);
  return { sub, tax, total: Math.max(0, sub + tax - (discount || 0)) };
};
const avatarColor = name => { const cols = ["#00d9a3", "#0ea5e9", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899"]; return cols[(name || "A").charCodeAt(0) % cols.length]; };
const isSlotTaken = (appointments, doctorId, date, time, excludeId = null) =>
  appointments.some(a => a.id !== excludeId && a.doctorid === doctorId && a.date === date && a.time === time && !["Cancelled", "No Show"].includes(a.status));

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => { const onR = () => setW(window.innerWidth); window.addEventListener("resize", onR); return () => window.removeEventListener("resize", onR); }, []);
  return w;
}

const DOCTORS = [
  { id: "D001", name: "Dr. Priya Sharma", dept: "General Medicine", fee: 500, slots: ["09:00", "09:30", "10:00", "11:00", "14:00", "15:00"] },
  { id: "D002", name: "Dr. Arjun Mehta", dept: "Cardiology", fee: 1200, slots: ["10:00", "10:30", "11:00", "15:00", "15:30"] },
  { id: "D003", name: "Dr. Sonal Gupta", dept: "Paediatrics", fee: 600, slots: ["09:00", "10:00", "11:00", "14:00", "15:00"] },
  { id: "D004", name: "Dr. Ramesh Iyer", dept: "Orthopaedics", fee: 800, slots: ["10:00", "11:00", "14:00", "15:00", "16:00"] },
  { id: "D005", name: "Dr. Nisha Verma", dept: "Gynaecology", fee: 900, slots: ["09:30", "10:30", "11:30", "14:30", "15:30"] },
];
const SERVICES = [
  { id: "S01", name: "Consultation", price: 500, gst: 0 },
  { id: "S02", name: "Blood Test (CBC)", price: 350, gst: 18 },
  { id: "S03", name: "X-Ray", price: 600, gst: 18 },
  { id: "S04", name: "ECG", price: 400, gst: 18 },
  { id: "S05", name: "Ultrasound", price: 1200, gst: 18 },
  { id: "S06", name: "Urine Analysis", price: 200, gst: 18 },
  { id: "S07", name: "MRI Scan", price: 5000, gst: 18 },
  { id: "S08", name: "CT Scan", price: 3500, gst: 18 },
  { id: "S09", name: "Dressing", price: 150, gst: 12 },
  { id: "S10", name: "Injection Admin", price: 100, gst: 12 },
  { id: "S11", name: "Physiotherapy", price: 700, gst: 18 },
  { id: "S12", name: "Eye Test", price: 300, gst: 12 },
];
const PAYMENT_MODES = ["Cash", "UPI", "Card"];
const DOC_TYPES = ["Report", "Prescription", "Test Result", "Other"];
const STATUS_BADGE = { Pending: "yellow", Confirmed: "green", "In Progress": "blue", Completed: "blue", Cancelled: "red", "No Show": "gray", Paid: "green", Partial: "yellow" };

const S = {
  app: { display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'DM Sans',sans-serif", background: "#0d1117", color: "#e6edf3", fontSize: 14 },
  card: (extra = {}) => ({ background: "#161b22", border: "1px solid #2d3748", borderRadius: 12, ...extra }),
  cardInner: { padding: 20 },
  statCard: () => ({ background: "#161b22", border: "1px solid #2d3748", borderRadius: 12, padding: 20, position: "relative", overflow: "hidden" }),
  statBar: (col) => ({ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: col }),
  btn: (v = "primary") => {
    const map = { primary: { background: "#00d9a3", color: "#000", border: "none" }, secondary: { background: "#1f2937", color: "#e6edf3", border: "1px solid #2d3748" }, danger: { background: "rgba(244,63,94,.15)", color: "#f43f5e", border: "1px solid rgba(244,63,94,.2)" }, blue: { background: "rgba(14,165,233,.15)", color: "#0ea5e9", border: "1px solid rgba(14,165,233,.2)" }, green: { background: "rgba(0,217,163,.15)", color: "#00d9a3", border: "1px solid rgba(0,217,163,.2)" }, purple: { background: "rgba(139,92,246,.15)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,.2)" }, gray: { background: "rgba(139,148,158,.12)", color: "#8b949e", border: "1px solid rgba(139,148,158,.15)" } };
    return { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, ...(map[v] || map.primary) };
  },
  badge: (c) => {
    const map = { green: { background: "rgba(0,217,163,.15)", color: "#00d9a3" }, yellow: { background: "rgba(245,158,11,.15)", color: "#f59e0b" }, red: { background: "rgba(244,63,94,.15)", color: "#f43f5e" }, blue: { background: "rgba(14,165,233,.15)", color: "#0ea5e9" }, gray: { background: "rgba(139,148,158,.12)", color: "#8b949e" } };
    return { display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 700, ...(map[c] || map.gray) };
  },
  input: { background: "#1f2937", border: "1px solid #2d3748", borderRadius: 8, padding: "9px 12px", color: "#e6edf3", fontFamily: "'DM Sans',sans-serif", fontSize: 13, outline: "none", width: "100%" },
  label: { fontSize: 11, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: .5, display: "block", marginBottom: 5 },
  th: { padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: .5, whiteSpace: "nowrap", background: "#1f2937" },
  td: { padding: "12px 16px", borderTop: "1px solid #2d3748", fontSize: 13, verticalAlign: "middle" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 20 },
  modal: { background: "#161b22", border: "1px solid #2d3748", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", padding: 28 },
  avatar: (name) => ({ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0, background: avatarColor(name) + "33", color: avatarColor(name) }),
  tab: (active) => ({ padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#e6edf3" : "#8b949e", background: active ? "#161b22" : "transparent" }),
};

function Badge({ status }) { return <span style={S.badge(STATUS_BADGE[status] || "gray")}>{status}</span>; }
function Avt({ name }) { return <div style={S.avatar(name)}>{(name || "?").split(" ").map(w => w[0]).slice(0, 2).join("")}</div>; }
function FG({ label, children }) { return <div style={{ display: "flex", flexDirection: "column" }}><label style={S.label}>{label}</label>{children}</div>; }

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, maxWidth: wide ? 820 : 620 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button style={S.btn("secondary")} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 32, height: 32, border: "3px solid #2d3748", borderTop: "3px solid #00d9a3", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
}

function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#00d9a3", color: "#000", padding: "12px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: "0 8px 32px rgba(0,217,163,.3)" }}>
      ✓ {message}
    </div>
  );
         }
function ResponsiveTable({ columns, rows, emptyText, isMobile, onRowClick, keyField = "id" }) {
  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(row => (
          <div key={row[keyField]} style={{ ...S.card(), padding: 14, cursor: onRowClick ? "pointer" : "default" }} onClick={() => onRowClick && onRowClick(row)}>
            {columns.map(col => (
              <div key={col.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #1f2937" }}>
                <span style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: .5, flexShrink: 0, marginRight: 10 }}>{col.label}</span>
                <span style={{ textAlign: "right" }}>{col.render ? col.render(row) : row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
        {rows.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#8b949e" }}>{emptyText}</div>}
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #2d3748" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{columns.map(c => <th key={c.key} style={S.th}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row[keyField]} style={onRowClick ? { cursor: "pointer" } : undefined} onClick={() => onRowClick && onRowClick(row)}>
              {columns.map(col => <td key={col.key} style={S.td}>{col.render ? col.render(row) : row[col.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#8b949e" }}>{emptyText}</div>}
    </div>
  );
}

function NotificationBell({ notifications, setNotifications }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notifications.filter(n => !n.read).length;
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const iconFor = (type) => ({ booking: "📅", payment: "💰", upcoming: "⏰", followup: "🔁" }[type] || "🔔");
  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, read: true })));
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <div onClick={() => setOpen(v => !v)} style={{ position: "relative", width: 36, height: 36, borderRadius: 8, background: "#1f2937", border: "1px solid #2d3748", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>
        🔔
        {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#f43f5e", color: "#fff", borderRadius: 99, minWidth: 16, height: 16, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{unread}</span>}
      </div>
      {open && (
        <div style={{ position: "absolute", top: 44, right: 0, width: 320, maxHeight: 400, overflowY: "auto", background: "#161b22", border: "1px solid #2d3748", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,.5)", zIndex: 600 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid #2d3748" }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Notifications</div>
            {unread > 0 && <div onClick={markAllRead} style={{ fontSize: 11, color: "#00d9a3", cursor: "pointer", fontWeight: 600 }}>Mark all read</div>}
          </div>
          {notifications.length === 0 ? <div style={{ padding: "24px 14px", textAlign: "center", color: "#8b949e", fontSize: 13 }}>No notifications</div> :
            notifications.slice(0, 20).map(n => (
              <div key={n.id} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "1px solid #1f2937", background: n.read ? "transparent" : "rgba(0,217,163,.04)" }}>
                <div style={{ fontSize: 16 }}>{iconFor(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{n.text}</div>
                  <div style={{ fontSize: 10, color: "#8b949e", marginTop: 3 }}>{fmtDate(n.date)}</div>
                </div>
                {!n.read && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00d9a3", flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email || !password) { setError("Email aur password daalna zaroori hai"); return; }
    setLoading(true); setError("");
    try {
      const res = await supa.auth(email, password, mode);
      if (res.error || res.msg) {
        setError(res.error_description || res.msg || "Login failed — check credentials");
      } else {
        onLogin(res.user || { email });
      }
    } catch (e) {
      setError("Network error — check internet connection");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", padding: 20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏥</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800, color: "#00d9a3" }}>MedCare</div>
          <div style={{ fontSize: 14, color: "#8b949e", marginTop: 4 }}>Clinic Management System</div>
        </div>
        <div style={{ background: "#161b22", border: "1px solid #2d3748", borderRadius: 16, padding: 32 }}>
          <div style={{ display: "flex", gap: 4, background: "#1f2937", borderRadius: 8, padding: 4, marginBottom: 24 }}>
            {[["signin", "Sign In"], ["signup", "Create Account"]].map(([v, l]) => (
              <div key={v} onClick={() => { setMode(v); setError(""); }} style={{ ...S.tab(mode === v), flex: 1, textAlign: "center" }}>{l}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FG label="Email">
              <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="clinic@email.com" onKeyDown={e => e.key === "Enter" && submit()} />
            </FG>
            <FG label="Password">
              <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()} />
            </FG>
            {error && <div style={{ background: "rgba(244,63,94,.1)", border: "1px solid rgba(244,63,94,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f43f5e" }}>{error}</div>}
            <button style={{ ...S.btn(), width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, opacity: loading ? 0.7 : 1 }} onClick={submit} disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign In →" : "Create Account →"}
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "#4a5568", marginTop: 20 }}>
          Powered by MedCare · Supabase Connected ✓
        </div>
      </div>
    </div>
  );
}

function Dashboard({ patients, appointments, bills, prescriptions, isMobile }) {
  const today = todayStr();
  const todayAppts = appointments.filter(a => a.date === today);
  const totalRevenue = bills.reduce((s, b) => s + (b.paid || 0), 0);
  const pending = appointments.filter(a => a.status === "Pending").length;
  const upcoming = appointments.filter(a => a.date >= today && !["Cancelled", "Completed"].includes(a.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const stats = [
    { label: "Total Patients", val: patients.length, icon: "🧑‍⚕️", col: "#00d9a3" },
    { label: "Today's Appointments", val: todayAppts.length, icon: "📅", col: "#0ea5e9" },
    { label: "Pending", val: pending, icon: "⏳", col: "#f59e0b" },
    { label: "Revenue Collected", val: fmtCur(totalRevenue), icon: "💰", col: "#8b5cf6" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>Good morning 👋</h2>
        <p style={{ fontSize: 13, color: "#8b949e", margin: 0 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...S.statCard(), borderTop: `3px solid ${s.col}` }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 18 : 24, fontWeight: 800, color: s.col }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        <div style={{ ...S.card(), padding: 20 }}>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Today's Schedule ({todayAppts.length})</h3>
          {todayAppts.length === 0 ? <div style={{ textAlign: "center", padding: "24px 0", color: "#8b949e" }}>No appointments today</div> :
            todayAppts.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1f2937", borderRadius: 8, padding: "10px 14px", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avt name={a.patientname} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{a.patientname}</div>
                    <div style={{ fontSize: 11, color: "#8b949e" }}>{fmtTime12(a.time)} · {a.dept}</div>
                  </div>
                </div>
                <Badge status={a.status} />
              </div>
            ))
          }
        </div>
        <div style={{ ...S.card(), padding: 20 }}>
          <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Upcoming Appointments</h3>
          {upcoming.length === 0 ? <div style={{ textAlign: "center", padding: "24px 0", color: "#8b949e" }}>No upcoming appointments</div> :
            upcoming.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1f2937", borderRadius: 8, padding: "12px 14px", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "center", minWidth: 56 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtDateShort(a.date)}</div>
                    <div style={{ fontSize: 11, color: "#8b949e" }}>{a.time}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.patientname}</div>
                    <div style={{ fontSize: 12, color: "#8b949e" }}>{a.dept}</div>
                  </div>
                </div>
                <Badge status={a.status} />
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
            }
function Patients({ patients, setPatients, appointments, bills, prescriptions, documents, setDocuments, isMobile, toast }) {
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewP, setViewP] = useState(null);
  const [saving, setSaving] = useState(false);
  const blank = { name: "", age: "", gender: "Male", phone: "", email: "", blood: "O+", address: "" };
  const [f, setF] = useState(blank);

  const list = patients.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.id.includes(q) || (p.phone || "").includes(q));

  const save = async () => {
    if (!f.name || !f.phone) return;
    setSaving(true);
    const newP = { ...f, id: "P" + uid(), joined: todayStr() };
    await supa.insert("patients", newP);
    setPatients([newP, ...patients]);
    setF(blank); setShowAdd(false); setSaving(false);
    toast("Patient registered successfully!");
  };

  const remove = async (id) => {
    await supa.delete("patients", id);
    setPatients(patients.filter(x => x.id !== id));
    toast("Patient removed");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, margin: 0 }}>Patient Records</h3><p style={{ fontSize: 12, color: "#8b949e", marginTop: 3 }}>{patients.length} registered</p></div>
        <button style={S.btn()} onClick={() => setShowAdd(true)}>＋ New Patient</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1f2937", border: "1px solid #2d3748", borderRadius: 8, padding: "8px 14px", marginBottom: 16 }}>
        <span style={{ color: "#8b949e" }}>🔍</span>
        <input style={{ ...S.input, border: "none", background: "transparent", padding: 0 }} placeholder="Search name, ID or phone…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <ResponsiveTable isMobile={isMobile} emptyText="No patients found" onRowClick={p => setViewP(p)}
        columns={[
          { key: "id", label: "ID", render: p => <span style={{ color: "#00d9a3", fontWeight: 700 }}>{p.id}</span> },
          { key: "name", label: "Patient", render: p => <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avt name={p.name} /><div><div style={{ fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{p.email}</div></div></div> },
          { key: "age", label: "Age/Gender", render: p => `${p.age}y · ${p.gender}` },
          { key: "phone", label: "Phone" },
          { key: "blood", label: "Blood", render: p => <span style={S.badge("red")}>{p.blood}</span> },
          { key: "joined", label: "Joined", render: p => <span style={{ color: "#8b949e" }}>{fmtDate(p.joined)}</span> },
          { key: "actions", label: "", render: p => <button style={{ ...S.btn("danger"), padding: "5px 10px", fontSize: 12 }} onClick={e => { e.stopPropagation(); remove(p.id); }}>Remove</button> },
        ]} rows={list} />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register New Patient">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <FG label="Full Name *"><input style={S.input} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Patient name" /></FG>
            <FG label="Age"><input style={S.input} type="number" value={f.age} onChange={e => setF({ ...f, age: e.target.value })} placeholder="Years" /></FG>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            <FG label="Gender"><select style={S.input} value={f.gender} onChange={e => setF({ ...f, gender: e.target.value })}>{["Male", "Female", "Other"].map(g => <option key={g}>{g}</option>)}</select></FG>
            <FG label="Blood Group"><select style={S.input} value={f.blood} onChange={e => setF({ ...f, blood: e.target.value })}>{["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(b => <option key={b}>{b}</option>)}</select></FG>
            <FG label="Phone *"><input style={S.input} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="Mobile no." /></FG>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <FG label="Email"><input style={S.input} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Email" /></FG>
            <FG label="Address"><input style={S.input} value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="Address" /></FG>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button style={S.btn("secondary")} onClick={() => setShowAdd(false)}>Cancel</button>
            <button style={{ ...S.btn(), opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Register Patient"}</button>
          </div>
        </div>
      </Modal>
      <PatientProfileModal patient={viewP} onClose={() => setViewP(null)} appointments={appointments} bills={bills} prescriptions={prescriptions} documents={documents} setDocuments={setDocuments} isMobile={isMobile} />
    </div>
  );
}

function PatientProfileModal({ patient, onClose, appointments, bills, prescriptions, documents, setDocuments, isMobile }) {
  const [tab, setTab] = useState("overview");
  const [docForm, setDocForm] = useState({ name: "", type: "Report", date: todayStr() });
  useEffect(() => { if (patient) setTab("overview"); }, [patient]);
  if (!patient) return null;

  const patAppts = appointments.filter(a => a.patientid === patient.id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  const patBills = bills.filter(b => b.patientid === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const patPrescriptions = prescriptions.filter(p => p.patientid === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const patDocs = (documents || []).filter(d => d.patientid === patient.id).sort((a, b) => b.date.localeCompare(a.date));

  const totalVisits = patAppts.filter(a => a.status === "Completed").length;
  const totalSpent = patBills.reduce((s, b) => s + (b.paid || 0), 0);
  const lastVisit = patAppts.find(a => a.status === "Completed");

  const addDoc = async () => {
    if (!docForm.name) return;
    const doc = { id: "DOC" + uid(), patientid: patient.id, ...docForm };
    await supa.insert("documents", doc);
    setDocuments([doc, ...(documents || [])]);
    setDocForm({ name: "", type: "Report", date: todayStr() });
  };

  const tabs = [["overview", "Overview"], ["history", "History"], ["prescriptions", "Prescriptions"], ["documents", "Documents"]];

  return (
    <Modal open={!!patient} onClose={onClose} title="Patient Profile" wide>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ ...S.avatar(patient.name), width: 56, height: 56, fontSize: 20 }}>{patient.name.split(" ").map(w => w[0]).join("")}</div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700 }}>{patient.name}</div>
          <div style={{ fontSize: 12, color: "#8b949e" }}>{patient.id} · Joined {fmtDate(patient.joined)}</div>
        </div>
        <span style={{ ...S.badge("red"), marginLeft: isMobile ? 0 : "auto" }}>{patient.blood}</span>
      </div>
      <div style={{ display: "flex", gap: 4, background: "#1f2937", borderRadius: 8, padding: 4, width: "fit-content", marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map(([v, l]) => <div key={v} onClick={() => setTab(v)} style={S.tab(tab === v)}>{l}</div>)}
      </div>

      {tab === "overview" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {[{ label: "Total Visits", val: totalVisits, icon: "🏥" }, { label: "Total Spent", val: fmtCur(totalSpent), icon: "💰" }, { label: "Last Visit", val: lastVisit ? fmtDateShort(lastVisit.date) : "—", icon: "🗓️" }, { label: "Prescriptions", val: patPrescriptions.length, icon: "💊" }].map(s => (
              <div key={s.label} style={{ background: "#1f2937", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: isMobile ? 15 : 18 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Age", patient.age + " years"], ["Gender", patient.gender], ["Phone", patient.phone], ["Email", patient.email || "—"], ["Address", patient.address || "—"], ["Blood Group", patient.blood]].map(([k, v]) => (
              <div key={k} style={{ background: "#1f2937", borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 4 }}>{k}</div>
                <div style={{ fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div>
          <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, margin: "0 0 10px", color: "#8b949e", textTransform: "uppercase" }}>Appointments ({patAppts.length})</h4>
          {patAppts.length === 0 ? <div style={{ color: "#8b949e", fontSize: 13 }}>No appointments yet</div> :
            patAppts.map(a => (
              <div key={a.id} style={{ background: "#1f2937", borderRadius: 8, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                <div><div style={{ fontWeight: 700, fontSize: 13 }}>{a.doctorname} · {a.dept}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{fmtDate(a.date)} at {fmtTime12(a.time)}</div></div>
                <Badge status={a.status} />
              </div>
            ))}
          <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700, margin: "18px 0 10px", color: "#8b949e", textTransform: "uppercase" }}>Invoices ({patBills.length})</h4>
          {patBills.length === 0 ? <div style={{ color: "#8b949e", fontSize: 13 }}>No invoices yet</div> :
            patBills.map(b => {
              const items = b.items || [];
              const { total } = calcBill(items, b.discount);
              return (
                <div key={b.id} style={{ background: "#1f2937", borderRadius: 8, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                  <div><div style={{ fontWeight: 700, fontSize: 13, color: "#00d9a3" }}>{b.id}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{fmtDate(b.date)} · {fmtCur(total)} total</div></div>
                  <Badge status={b.status} />
                </div>
              );
            })}
        </div>
      )}

      {tab === "prescriptions" && (
        <div>
          {patPrescriptions.length === 0 ? <div style={{ color: "#8b949e", fontSize: 13 }}>No prescriptions</div> :
            patPrescriptions.map(p => (
              <div key={p.id} style={{ background: "#1f2937", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>{p.diagnosis}</div>
                <div style={{ fontSize: 11, color: "#8b949e" }}>{fmtDate(p.date)} · {p.doctorname}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {(p.medicines || []).map((m, i) => <span key={i} style={{ background: "#161b22", border: "1px solid #2d3748", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>{m.name}{m.dosage && ` · ${m.dosage}`}{m.frequency && ` · ${m.frequency}`}</span>)}
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === "documents" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input style={{ ...S.input, flex: 2, minWidth: 140 }} placeholder="Document name" value={docForm.name} onChange={e => setDocForm({ ...docForm, name: e.target.value })} />
            <select style={{ ...S.input, flex: 1, minWidth: 120 }} value={docForm.type} onChange={e => setDocForm({ ...docForm, type: e.target.value })}>{DOC_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            <input style={{ ...S.input, flex: 1, minWidth: 120 }} type="date" value={docForm.date} onChange={e => setDocForm({ ...docForm, date: e.target.value })} />
            <button style={S.btn()} onClick={addDoc}>＋ Attach</button>
          </div>
          {patDocs.length === 0 ? <div style={{ color: "#8b949e", fontSize: 13 }}>No documents</div> :
            patDocs.map(d => (
              <div key={d.id} style={{ background: "#1f2937", borderRadius: 8, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <div><div style={{ fontWeight: 700, fontSize: 13 }}>{d.name}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{d.type} · {fmtDate(d.date)}</div></div>
                </div>
                <button style={{ ...S.btn("danger"), padding: "5px 10px", fontSize: 11 }} onClick={async () => { await supa.delete("documents", d.id); setDocuments((documents || []).filter(x => x.id !== d.id)); }}>Remove</button>
              </div>
            ))}
        </div>
      )}
    </Modal>
  );
       function Appointments({ appointments, setAppointments, patients, addNotification, isMobile, toast }) {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const blank = { patientId: "", doctorId: "", date: todayStr(), time: "", notes: "" };
  const [f, setF] = useState(blank);

  const selDoc = DOCTORS.find(d => d.id === f.doctorId);
  const availableSlots = selDoc ? selDoc.slots.filter(s => !isSlotTaken(appointments, f.doctorId, f.date, s)) : [];

  const filtered = appointments.filter(a => {
    if (tab !== "all" && a.status.toLowerCase().replace(" ", "") !== tab.replace(" ", "")) return false;
    if (deptFilter !== "all" && a.dept !== deptFilter) return false;
    if (q) { const ql = q.toLowerCase(); if (!(a.patientname || "").toLowerCase().includes(ql) && !(a.doctorname || "").toLowerCase().includes(ql) && !a.id.toLowerCase().includes(ql)) return false; }
    return true;
  }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const depts = [...new Set(DOCTORS.map(d => d.dept))];

  const book = async () => {
    if (!f.patientId || !f.doctorId || !f.date || !f.time) { setError("Sab fields fill karo"); return; }
    if (isSlotTaken(appointments, f.doctorId, f.date, f.time)) { setError("Ye slot already booked hai"); return; }
    setSaving(true);
    const pat = patients.find(p => p.id === f.patientId);
    const doc = DOCTORS.find(d => d.id === f.doctorId);
    const appt = { id: "A" + uid(), patientid: pat.id, patientname: pat.name, doctorid: doc.id, doctorname: doc.name, dept: doc.dept, date: f.date, time: f.time, status: "Confirmed", fee: doc.fee, notes: f.notes };
    await supa.insert("appointments", appt);
    setAppointments([appt, ...appointments]);
    addNotification({ type: "booking", text: `New appointment booked for ${pat.name} with ${doc.name}` });
    setF(blank); setShow(false); setError(""); setSaving(false);
    toast("Appointment booked!");
  };

  const updateStatus = async (id, status) => {
    await supa.update("appointments", id, { status });
    setAppointments(appointments.map(a => a.id === id ? { ...a, status } : a));
    toast("Status updated");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, margin: 0 }}>Appointments</h3><p style={{ fontSize: 12, color: "#8b949e", marginTop: 3 }}>{appointments.length} total</p></div>
        <button style={S.btn()} onClick={() => setShow(true)}>＋ Book Appointment</button>
      </div>
      <div style={{ display: "flex", gap: 4, background: "#1f2937", borderRadius: 8, padding: 4, width: "fit-content", marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All"], ["pending", "Pending"], ["confirmed", "Confirmed"], ["completed", "Completed"], ["cancelled", "Cancelled"]].map(([v, l]) => (
          <div key={v} onClick={() => setTab(v)} style={S.tab(tab === v)}>{l}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1f2937", border: "1px solid #2d3748", borderRadius: 8, padding: "8px 14px", flex: 2, minWidth: 200 }}>
          <span style={{ color: "#8b949e" }}>🔍</span>
          <input style={{ ...S.input, border: "none", background: "transparent", padding: 0 }} placeholder="Search patient, doctor…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select style={{ ...S.input, flex: 1, minWidth: 160 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <ResponsiveTable isMobile={isMobile} emptyText="No appointments found"
        columns={[
          { key: "id", label: "ID", render: a => <span style={{ color: "#00d9a3", fontWeight: 700 }}>{a.id}</span> },
          { key: "patientname", label: "Patient", render: a => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avt name={a.patientname} /><span style={{ fontWeight: 600 }}>{a.patientname}</span></div> },
          { key: "doctorname", label: "Doctor", render: a => <div><div style={{ fontWeight: 600 }}>{a.doctorname}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{a.dept}</div></div> },
          { key: "date", label: "Date & Time", render: a => <div><div style={{ fontWeight: 600 }}>{fmtDate(a.date)}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{fmtTime12(a.time)}</div></div> },
          { key: "fee", label: "Fee", render: a => <span style={{ color: "#00d9a3", fontWeight: 700 }}>{fmtCur(a.fee)}</span> },
          { key: "status", label: "Status", render: a => <Badge status={a.status} /> },
          {
            key: "actions", label: "Actions", render: a => (
              <select style={{ ...S.input, width: 130, padding: "5px 8px", fontSize: 12 }} value={a.status} onChange={e => updateStatus(a.id, e.target.value)}>
                {["Pending", "Confirmed", "In Progress", "Completed", "Cancelled", "No Show"].map(s => <option key={s}>{s}</option>)}
              </select>
            )
          },
        ]} rows={filtered} />
      <Modal open={show} onClose={() => setShow(false)} title="Book Appointment">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FG label="Patient *">
            <select style={S.input} value={f.patientId} onChange={e => setF({ ...f, patientId: e.target.value })}>
              <option value="">-- Select Patient --</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </FG>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <FG label="Doctor *">
              <select style={S.input} value={f.doctorId} onChange={e => setF({ ...f, doctorId: e.target.value, time: "" })}>
                <option value="">-- Select Doctor --</option>
                {DOCTORS.map(d => <option key={d.id} value={d.id}>{d.name} · {d.dept}</option>)}
              </select>
            </FG>
            <FG label="Date *"><input style={S.input} type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value, time: "" })} /></FG>
          </div>
          <FG label="Time Slot *">
            <select style={S.input} value={f.time} onChange={e => setF({ ...f, time: e.target.value })}>
              <option value="">-- Pick slot --</option>
              {availableSlots.map(s => <option key={s} value={s}>{fmtTime12(s)}</option>)}
              {selDoc && availableSlots.length === 0 && <option disabled>No slots available</option>}
            </select>
          </FG>
          <FG label="Notes"><textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Reason for visit…" /></FG>
          {error && <div style={{ color: "#f43f5e", fontSize: 13 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={S.btn("secondary")} onClick={() => setShow(false)}>Cancel</button>
            <button style={{ ...S.btn(), opacity: saving ? 0.7 : 1 }} onClick={book} disabled={saving}>{saving ? "Booking…" : "Book Appointment"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CalendarView({ appointments, isMobile }) {
  const [view, setView] = useState("monthly");
  const [ref, setRef] = useState(todayStr());
  const apptsOn = (date) => appointments.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const navigate = (dir) => {
    if (view === "daily") setRef(addDays(ref, dir));
    else if (view === "weekly") setRef(addDays(ref, dir * 7));
    else { const d = new Date(ref); d.setMonth(d.getMonth() + dir); setRef(d.toISOString().split("T")[0]); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, margin: 0 }}>Appointment Calendar</h3>
        <div style={{ display: "flex", gap: 4, background: "#1f2937", borderRadius: 8, padding: 4 }}>
          {[["daily", "Day"], ["weekly", "Week"], ["monthly", "Month"]].map(([v, l]) => <div key={v} onClick={() => setView(v)} style={S.tab(view === v)}>{l}</div>)}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={S.btn("secondary")} onClick={() => navigate(-1)}>← Prev</button>
          <button style={S.btn("secondary")} onClick={() => setRef(todayStr())}>Today</button>
          <button style={S.btn("secondary")} onClick={() => navigate(1)}>Next →</button>
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>
          {view === "daily" && fmtDate(ref)}{view === "weekly" && `Week of ${fmtDate(startOfWeek(ref))}`}{view === "monthly" && monthLabel(ref)}
        </div>
      </div>
      {view === "monthly" && (() => {
        const cells = daysInMonthGrid(ref);
        return (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: isMobile ? 2 : 6, marginBottom: 6 }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(w => <div key={w} style={{ textAlign: "center", fontSize: 11, color: "#8b949e", fontWeight: 700, textTransform: "uppercase" }}>{isMobile ? w[0] : w}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: isMobile ? 2 : 6 }}>
              {cells.map(d => {
                const appts = apptsOn(d); const isToday = d === todayStr(); const inMonth = isSameMonth(d, ref);
                return (
                  <div key={d} onClick={() => { setRef(d); setView("daily"); }} style={{ ...S.card(), padding: isMobile ? 6 : 10, minHeight: isMobile ? 56 : 80, cursor: "pointer", opacity: inMonth ? 1 : 0.35, border: isToday ? "1px solid rgba(0,217,163,.5)" : "1px solid #2d3748" }}>
                    <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: isToday ? 800 : 600, color: isToday ? "#00d9a3" : "#e6edf3" }}>{new Date(d).getDate()}</div>
                    {!isMobile && appts.slice(0, 2).map(a => <div key={a.id} style={{ fontSize: 10, background: "rgba(0,217,163,.1)", color: "#00d9a3", borderRadius: 4, padding: "2px 4px", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.time} {a.patientname}</div>)}
                    {appts.length > 0 && <div style={{ fontSize: 9, color: "#00d9a3", fontWeight: 700, marginTop: 2 }}>{appts.length}●</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {view === "daily" && (
        <div style={{ ...S.card(), padding: 20 }}>
          <h4 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>{fmtDate(ref)}</h4>
          {apptsOn(ref).length === 0 ? <div style={{ textAlign: "center", padding: "32px 0", color: "#8b949e" }}>No appointments</div> :
            apptsOn(ref).map(a => (
              <div key={a.id} style={{ background: "#1f2937", border: "1px solid #2d3748", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, color: "#00d9a3" }}>{fmtTime12(a.time)}</span><Badge status={a.status} /></div>
                <div style={{ fontWeight: 600, marginTop: 2 }}>{a.patientname}</div>
                <div style={{ fontSize: 11, color: "#8b949e" }}>{a.doctorname} · {a.dept}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
     }
   function Billing({ bills, setBills, patients, addNotification, isMobile, toast }) {
  const [show, setShow] = useState(false);
  const [viewBill, setViewBill] = useState(null);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const blank = { patientId: "", doctorId: DOCTORS[0].id, items: [], discount: 0, paid: 0, paymentMode: "Cash" };
  const [f, setF] = useState(blank);
  const [payInput, setPayInput] = useState({});
  const [payMode, setPayMode] = useState({});

  const filtered = bills.filter(b => {
    if (tab !== "all" && b.status.toLowerCase() !== tab) return false;
    if (q) { const ql = q.toLowerCase(); if (!(b.patientname || "").toLowerCase().includes(ql) && !b.id.toLowerCase().includes(ql)) return false; }
    return true;
  });

  const addItem = (svc) => {
    const exists = f.items.find(i => i.name === svc.name);
    if (exists) setF({ ...f, items: f.items.map(i => i.name === svc.name ? { ...i, qty: i.qty + 1 } : i) });
    else setF({ ...f, items: [...f.items, { name: svc.name, price: svc.price, gst: svc.gst, qty: 1 }] });
  };

  const save = async () => {
    if (!f.patientId || f.items.length === 0) return;
    setSaving(true);
    const pat = patients.find(p => p.id === f.patientId);
    const doc = DOCTORS.find(d => d.id === f.doctorId);
    const { total } = calcBill(f.items, f.discount);
    const paid = Math.min(Number(f.paid) || 0, total);
    const status = paid >= total ? "Paid" : paid > 0 ? "Partial" : "Pending";
    const paymentHistory = paid > 0 ? [{ amount: paid, mode: f.paymentMode, date: todayStr() }] : [];
    const bill = { id: "INV-" + uid(), patientid: pat.id, patientname: pat.name, doctorname: doc.name, date: todayStr(), items: f.items, discount: Number(f.discount) || 0, paid, status, paymenthistory: paymentHistory };
    await supa.insert("bills", bill);
    setBills([bill, ...bills]);
    if (status !== "Paid") addNotification({ type: "payment", text: `Pending payment of ${fmtCur(total - paid)} from ${pat.name}` });
    setF(blank); setShow(false); setSaving(false);
    toast("Invoice generated!");
  };

  const recordPayment = async (id, amt, mode) => {
    const amount = Number(amt);
    if (!amount || amount <= 0) return;
    const bill = bills.find(b => b.id === id);
    const { total } = calcBill(bill.items || [], bill.discount);
    const newPaid = Math.min((bill.paid || 0) + amount, total);
    const status = newPaid >= total ? "Paid" : newPaid > 0 ? "Partial" : "Pending";
    const paymenthistory = [...(bill.paymenthistory || []), { amount, mode: mode || "Cash", date: todayStr() }];
    await supa.update("bills", id, { paid: newPaid, status, paymenthistory });
    setBills(bills.map(b => b.id === id ? { ...b, paid: newPaid, status, paymenthistory } : b));
    setPayInput({ ...payInput, [id]: "" });
    toast("Payment recorded!");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, margin: 0 }}>Billing & Invoices</h3><p style={{ fontSize: 12, color: "#8b949e", marginTop: 3 }}>{bills.length} invoices</p></div>
        <button style={S.btn()} onClick={() => setShow(true)}>＋ New Invoice</button>
      </div>
      <div style={{ display: "flex", gap: 4, background: "#1f2937", borderRadius: 8, padding: 4, width: "fit-content", marginBottom: 16, flexWrap: "wrap" }}>
        {[["all", "All"], ["paid", "Paid"], ["pending", "Pending"], ["partial", "Partial"]].map(([v, l]) => (
          <div key={v} onClick={() => setTab(v)} style={S.tab(tab === v)}>{l}</div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1f2937", border: "1px solid #2d3748", borderRadius: 8, padding: "8px 14px", marginBottom: 16 }}>
        <span style={{ color: "#8b949e" }}>🔍</span>
        <input style={{ ...S.input, border: "none", background: "transparent", padding: 0 }} placeholder="Search invoice or patient…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <ResponsiveTable isMobile={isMobile} emptyText="No invoices"
        columns={[
          { key: "id", label: "Invoice", render: b => <span style={{ color: "#00d9a3", fontWeight: 700, cursor: "pointer" }} onClick={() => setViewBill(b)}>{b.id}</span> },
          { key: "patientname", label: "Patient" },
          { key: "doctorname", label: "Doctor", render: b => b.doctorname || "—" },
          { key: "date", label: "Date", render: b => fmtDate(b.date) },
          { key: "total", label: "Total", render: b => <span style={{ fontWeight: 700 }}>{fmtCur(calcBill(b.items || [], b.discount).total)}</span> },
          { key: "paid", label: "Paid", render: b => <span style={{ color: "#00d9a3" }}>{fmtCur(b.paid)}</span> },
          { key: "status", label: "Status", render: b => <Badge status={b.status} /> },
          {
            key: "actions", label: "Actions", render: b => (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                <button style={{ ...S.btn("secondary"), padding: "5px 10px", fontSize: 11 }} onClick={() => setViewBill(b)}>View</button>
                {b.status !== "Paid" && (<>
                  <input style={{ ...S.input, width: 80, padding: "5px 8px", fontSize: 12 }} placeholder="₹" value={payInput[b.id] || ""} onChange={e => setPayInput({ ...payInput, [b.id]: e.target.value })} />
                  <select style={{ ...S.input, width: 80, padding: "5px 8px", fontSize: 12 }} value={payMode[b.id] || "Cash"} onChange={e => setPayMode({ ...payMode, [b.id]: e.target.value })}>{PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}</select>
                  <button style={{ ...S.btn("green"), padding: "5px 10px", fontSize: 11 }} onClick={() => recordPayment(b.id, payInput[b.id] || 0, payMode[b.id] || "Cash")}>Pay</button>
                </>)}
              </div>
            )
          },
        ]} rows={filtered} />
      <Modal open={show} onClose={() => setShow(false)} title="Create Invoice" wide>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <FG label="Patient *">
                <select style={S.input} value={f.patientId} onChange={e => setF({ ...f, patientId: e.target.value })}>
                  <option value="">-- Patient --</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </FG>
              <FG label="Doctor">
                <select style={S.input} value={f.doctorId} onChange={e => setF({ ...f, doctorId: e.target.value })}>
                  {DOCTORS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </FG>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", marginBottom: 8 }}>Add Services</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {SERVICES.map(svc => (
                <button key={svc.id} onClick={() => addItem(svc)} style={{ background: "#1f2937", border: "1px solid #2d3748", borderRadius: 8, padding: "8px 10px", cursor: "pointer", textAlign: "left", color: "#e6edf3" }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{svc.name}</div>
                  <div style={{ fontSize: 11, color: "#00d9a3" }}>{fmtCur(svc.price)}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", marginBottom: 8 }}>Invoice Items</div>
            {f.items.length === 0 ? <div style={{ color: "#8b949e", fontSize: 13, padding: "20px 0" }}>No items yet</div> :
              f.items.map(item => (
                <div key={item.name} style={{ background: "#1f2937", borderRadius: 8, padding: "10px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div><div style={{ fontSize: 11, color: "#8b949e" }}>x{item.qty} · GST {item.gst}%</div></div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{fmtCur(item.price * item.qty * (1 + item.gst / 100))}</div>
                    <button style={{ fontSize: 11, color: "#f43f5e", background: "none", border: "none", cursor: "pointer" }} onClick={() => setF({ ...f, items: f.items.filter(i => i.name !== item.name) })}>remove</button>
                  </div>
                </div>
              ))}
            {f.items.length > 0 && (() => { const { sub, tax, total } = calcBill(f.items, f.discount); return (<div style={{ background: "rgba(0,217,163,.06)", border: "1px solid rgba(0,217,163,.15)", borderRadius: 8, padding: 14, marginTop: 8 }}>{[["Subtotal", fmtCur(sub)], ["GST", fmtCur(tax)], ["Discount", "- " + fmtCur(f.discount || 0)], ["Total", fmtCur(total)]].map(([k, v], i) => (<div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: i === 3 ? 800 : 400, color: i === 3 ? "#00d9a3" : "#e6edf3" }}><span>{k}</span><span>{v}</span></div>))}</div>); })()}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <FG label="Discount (₹)"><input style={S.input} type="number" value={f.discount} onChange={e => setF({ ...f, discount: e.target.value })} /></FG>
              <FG label="Paid Now (₹)"><input style={S.input} type="number" value={f.paid} onChange={e => setF({ ...f, paid: e.target.value })} /></FG>
            </div>
            <FG label="Payment Mode"><select style={S.input} value={f.paymentMode} onChange={e => setF({ ...f, paymentMode: e.target.value })}>{PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}</select></FG>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button style={S.btn("secondary")} onClick={() => setShow(false)}>Cancel</button>
              <button style={{ ...S.btn(), opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Generate Invoice"}</button>
            </div>
          </div>
        </div>
      </Modal>
      <Modal open={!!viewBill} onClose={() => setViewBill(null)} title="Invoice Details" wide>
        {viewBill && (() => {
          const items = viewBill.items || [];
          const { sub, tax, total } = calcBill(items, viewBill.discount);
          const bal = total - (viewBill.paid || 0);
          return (
            <div>
              <div id="invoice-print" style={{ background: "#fff", color: "#111", borderRadius: 12, padding: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, paddingBottom: 20, borderBottom: "2px solid #e5e7eb", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏥</div>
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#059669" }}>MedCare Clinic</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>General & Multi-specialty Hospital<br />123, Health Avenue, New Delhi<br />GSTIN: 07AABCC1234Z1Z5</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1f2937" }}>{viewBill.id}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>Date: {fmtDate(viewBill.date)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>BILL TO</div><div style={{ fontWeight: 700 }}>{viewBill.patientname}</div></div>
                  <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>DOCTOR</div><div style={{ fontWeight: 700 }}>{viewBill.doctorname || "—"}</div></div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                  <thead><tr style={{ background: "#f3f4f6" }}>{["Service", "Qty", "Rate", "GST%", "Amount"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#374151" }}>{h}</th>)}</tr></thead>
                  <tbody>{items.map(item => (<tr key={item.name} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{ padding: "10px 12px", fontSize: 13 }}>{item.name}</td><td style={{ padding: "10px 12px", fontSize: 13 }}>{item.qty}</td><td style={{ padding: "10px 12px", fontSize: 13 }}>{fmtCur(item.price)}</td><td style={{ padding: "10px 12px", fontSize: 13 }}>{item.gst}%</td><td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{fmtCur(item.price * item.qty * (1 + item.gst / 100))}</td></tr>))}</tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ minWidth: 240 }}>
                    {[["Subtotal", fmtCur(sub)], ["GST", fmtCur(tax)], ["Discount", "- " + fmtCur(viewBill.discount || 0)]].map(([k, v]) => (<div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}><span>{k}</span><span>{v}</span></div>))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 17, fontWeight: 800, color: "#059669", borderTop: "2px solid #e5e7eb", marginTop: 4 }}><span>Total</span><span>{fmtCur(total)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Paid</span><span style={{ color: "#059669", fontWeight: 600 }}>{fmtCur(viewBill.paid || 0)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: bal > 0 ? "#dc2626" : "#059669" }}><span>Balance Due</span><span>{fmtCur(bal)}</span></div>
                  </div>
                </div>
                <div style={{ marginTop: 24, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#6b7280", textAlign: "center" }}>Thank you for choosing MedCare Clinic. Get well soon! 🌿</div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button style={S.btn("secondary")} onClick={() => window.print()}>🖨️ Print</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function Prescriptions({ prescriptions, setPrescriptions, patients, addNotification, isMobile, toast }) {
  const [show, setShow] = useState(false);
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const blankMed = { name: "", dosage: "", frequency: "", duration: "" };
  const blank = { patientId: "", doctorId: DOCTORS[0].id, date: todayStr(), diagnosis: "", medicines: [{ ...blankMed }], instructions: "", followUpDate: "" };
  const [f, setF] = useState(blank);

  const filtered = prescriptions.filter(p => {
    if (!q) return true;
    const ql = q.toLowerCase();
    return (p.patientname || "").toLowerCase().includes(ql) || (p.diagnosis || "").toLowerCase().includes(ql);
  }).sort((a, b) => b.date.localeCompare(a.date));

  const save = async () => {
    if (!f.patientId || !f.diagnosis) return;
    setSaving(true);
    const pat = patients.find(p => p.id === f.patientId);
    const doc = DOCTORS.find(d => d.id === f.doctorId);
    const validMeds = f.medicines.filter(m => m.name.trim());
    const rx = { id: "RX" + uid(), patientid: pat.id, patientname: pat.name, doctorid: doc.id, doctorname: doc.name, date: f.date, diagnosis: f.diagnosis, medicines: validMeds, instructions: f.instructions, followupdate: f.followUpDate };
    await supa.insert("prescriptions", rx);
    setPrescriptions([rx, ...prescriptions]);
    if (f.followUpDate) addNotification({ type: "followup", text: `Follow-up for ${pat.name} on ${fmtDate(f.followUpDate)}` });
    setF(blank); setShow(false); setSaving(false);
    toast("Prescription saved!");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div><h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, margin: 0 }}>Prescriptions</h3><p style={{ fontSize: 12, color: "#8b949e", marginTop: 3 }}>{prescriptions.length} on record</p></div>
        <button style={S.btn()} onClick={() => setShow(true)}>＋ New Prescription</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1f2937", border: "1px solid #2d3748", borderRadius: 8, padding: "8px 14px", marginBottom: 16 }}>
        <span style={{ color: "#8b949e" }}>🔍</span>
        <input style={{ ...S.input, border: "none", background: "transparent", padding: 0 }} placeholder="Search patient or diagnosis…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {filtered.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "#8b949e" }}>No prescriptions found</div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ ...S.card(), padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avt name={p.patientname} /><div><div style={{ fontWeight: 700 }}>{p.patientname}</div><div style={{ fontSize: 11, color: "#8b949e" }}>{p.doctorname} · {fmtDate(p.date)}</div></div></div>
                {p.followupdate && <span style={S.badge("blue")}>Follow-up {fmtDateShort(p.followupdate)}</span>}
              </div>
              <div style={{ background: "#1f2937", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#8b949e", marginBottom: 2 }}>Diagnosis</div>
                <div style={{ fontWeight: 600 }}>{p.diagnosis}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(p.medicines || []).map((m, i) => <span key={i} style={{ background: "#1f2937", border: "1px solid #2d3748", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>{m.name}{m.dosage && ` · ${m.dosage}`}{m.frequency && ` · ${m.frequency}`}</span>)}
              </div>
            </div>
          ))}
        </div>}
      <Modal open={show} onClose={() => setShow(false)} title="New Prescription" wide>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            <FG label="Patient *"><select style={S.input} value={f.patientId} onChange={e => setF({ ...f, patientId: e.target.value })}><option value="">-- Select --</option>{pat
