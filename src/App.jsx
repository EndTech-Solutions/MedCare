import { useState, useEffect, useRef } from "react";

/* ════════════════════════════════════════════════════════════════════════
   SUPABASE CONFIG — apni keys yahan daalo
   ════════════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════════════
   UTILITIES
   ════════════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════════════
   STATIC DATA
   ════════════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ════════════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════════════
   LOGIN SCREEN
   ════════════════════════════════════════════════════════════════════════ */
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // signin | signup
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

            {error && <div style={{ background: "rgba(244,63,94,.1)", border: "1px solid rgba(244,63,94,.2)", borderRadius:
