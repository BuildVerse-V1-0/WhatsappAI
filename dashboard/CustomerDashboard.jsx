import { useState, useRef, useEffect } from "react";

// ─── Styles ────────────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #080c12;
    --surface: rgba(255,255,255,0.04);
    --surface-hover: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.07);
    --border-hover: rgba(88,166,255,0.35);
    --text-1: #e8edf5;
    --text-2: #6e7a8a;
    --accent: #58a6ff;
    --accent-dim: rgba(88,166,255,0.12);
    --danger: #f85149;
    --danger-dim: rgba(248,81,73,0.12);
    --success: #3fb950;
    --success-dim: rgba(63,185,80,0.12);
    --warn: #d29922;
    --warn-dim: rgba(210,153,34,0.12);
    --purple: #a371f7;
    --purple-dim: rgba(163,113,247,0.12);
    --glow-accent: 0 0 40px rgba(88,166,255,0.15);
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    color: var(--text-1);
    min-height: 100vh;
    background-image:
      radial-gradient(ellipse 60% 50% at 10% 60%, rgba(88,166,255,0.07) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 90% 20%, rgba(163,113,247,0.06) 0%, transparent 60%);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// ─── Mock Data ──────────────────────────────────────────────────────────────
const MOCK_DATA = {
  total_customers: 50,
  repeat_customers: 20,
  new_customers: 10,
  pending_payments: 5,
  inactive_customers: 15,
  repeat_percentage: "40.0%",
  total_pending_amount: 1250.50,
};

const METRICS = [
  {
    key: "total_customers",
    label: "Total Customers",
    icon: "👥",
    colorVar: "--accent",
    dimVar: "--accent-dim",
    format: (v) => v,
  },
  {
    key: "repeat_customers",
    label: "Repeat Customers",
    icon: "🔄",
    colorVar: "--success",
    dimVar: "--success-dim",
    format: (v) => v,
  },
  {
    key: "new_customers",
    label: "New Customers",
    icon: "✨",
    colorVar: "--purple",
    dimVar: "--purple-dim",
    format: (v) => v,
  },
  {
    key: "inactive_customers",
    label: "Inactive Customers",
    icon: "🌙",
    colorVar: "--warn",
    dimVar: "--warn-dim",
    format: (v) => v,
  },
  {
    key: "pending_payments",
    label: "Pending Payments",
    icon: "⏳",
    colorVar: "--danger",
    dimVar: "--danger-dim",
    format: (v) => v,
  },
  {
    key: "total_pending_amount",
    label: "Pending Amount",
    icon: "₹",
    colorVar: "--danger",
    dimVar: "--danger-dim",
    format: (v) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
  },
];

// ─── Metric Card ────────────────────────────────────────────────────────────
function MetricCard({ metric, value, delay }) {
  const [hovered, setHovered] = useState(false);
  const displayValue = metric.format(value);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--surface-hover)" : "var(--surface)",
        border: `1px solid ${hovered ? "var(--border-hover)" : "var(--border)"}`,
        borderRadius: "18px",
        padding: "26px 24px",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 20px 60px rgba(0,0,0,0.4), var(--glow-accent)"
          : "0 4px 24px rgba(0,0,0,0.2)",
        animation: `fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      {/* Glow blob */}
      <div style={{
        position: "absolute", top: "-20px", right: "-20px",
        width: "100px", height: "100px",
        background: `var(${metric.dimVar})`,
        borderRadius: "50%",
        filter: "blur(20px)",
        opacity: hovered ? 1 : 0.5,
        transition: "opacity 0.3s",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            color: "var(--text-2)",
            marginBottom: "12px",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {metric.label}
          </div>
          <div style={{
            fontSize: "2.6rem",
            fontWeight: 800,
            fontFamily: "'Syne', sans-serif",
            color: `var(${metric.colorVar})`,
            lineHeight: 1,
            letterSpacing: "-1px",
          }}>
            {displayValue}
          </div>
        </div>
        <div style={{
          width: "44px", height: "44px",
          background: `var(${metric.dimVar})`,
          borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem",
          flexShrink: 0,
        }}>
          {metric.icon}
        </div>
      </div>
    </div>
  );
}

// ─── Uploader ───────────────────────────────────────────────────────────────
function Uploader() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleFiles = (incoming) => {
    const list = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setUploading(true);
    setTimeout(() => {
      setFiles((prev) => [
        ...prev,
        ...list.map((f) => ({ name: f.name, url: URL.createObjectURL(f), size: f.size })),
      ]);
      setUploading(false);
    }, 1400);
  };

  return (
    <div style={{
      marginTop: "40px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "18px",
      padding: "30px",
      animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 700ms both",
    }}>
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.2rem", marginBottom: "6px" }}>
          Store Visuals
        </h3>
        <p style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>
          Upload shop catalog images or store banners to Supabase.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          borderRadius: "12px",
          padding: "36px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.25s ease",
          background: dragging ? "var(--accent-dim)" : "transparent",
          marginBottom: "16px",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "32px", height: "32px",
              border: "3px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>Uploading…</span>
          </div>
        ) : (
          <>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ color: "var(--text-2)", marginBottom: "10px" }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ color: "var(--text-2)", fontSize: "0.9rem", margin: 0 }}>
              {dragging ? "Drop to upload" : "Drag & drop or click to browse"}
            </p>
          </>
        )}
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        style={{
          background: "var(--accent)",
          color: "#000",
          border: "none",
          padding: "11px 24px",
          borderRadius: "9px",
          fontWeight: 600,
          fontSize: "0.95rem",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.2s ease",
          letterSpacing: "0.2px",
        }}
        onMouseEnter={(e) => { e.target.style.background = "#79b8ff"; e.target.style.transform = "scale(1.04)"; }}
        onMouseLeave={(e) => { e.target.style.background = "var(--accent)"; e.target.style.transform = "scale(1)"; }}
      >
        Upload Image
      </button>

      {/* Preview Grid */}
      {files.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: "10px",
          marginTop: "20px",
        }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "1" }}>
              <img src={f.url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "flex-end",
                padding: "6px",
                opacity: 0,
                transition: "opacity 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >
                <span style={{ color: "#fff", fontSize: "0.65rem", wordBreak: "break-all" }}>{f.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Live Indicator ─────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", justifyContent: "center", marginTop: "8px" }}>
      <div style={{ position: "relative", width: "8px", height: "8px" }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "var(--success)",
          animation: "pulse-ring 1.5s ease-out infinite",
        }} />
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)" }} />
      </div>
      <span style={{ color: "var(--text-2)", fontSize: "0.8rem", letterSpacing: "0.5px" }}>Live</span>
    </div>
  );
}

// ─── Repeat Rate Bar ─────────────────────────────────────────────────────────
function RepeatRateBar({ percent }) {
  const num = parseFloat(percent);
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "18px",
      padding: "22px 24px",
      animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 600ms both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-2)" }}>
          Repeat Rate
        </span>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "var(--success)" }}>
          {percent}
        </span>
      </div>
      <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${num}%`,
          background: "linear-gradient(90deg, var(--success), #43d9ad)",
          borderRadius: "99px",
          transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
        }} />
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.textContent = globalStyles;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  const data = MOCK_DATA;

  return (
    <div style={{ minHeight: "100vh", padding: "48px 20px", maxWidth: "1040px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px", animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0ms both" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "var(--accent-dim)", border: "1px solid rgba(88,166,255,0.2)",
          borderRadius: "99px", padding: "5px 14px",
          fontSize: "0.75rem", fontWeight: 600, color: "var(--accent)",
          letterSpacing: "1px", textTransform: "uppercase",
          marginBottom: "18px",
        }}>
          <span>WhatsApp AI</span>
          <span style={{ width: "1px", height: "12px", background: "rgba(88,166,255,0.3)" }} />
          <span>Business Dashboard</span>
        </div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          letterSpacing: "-1.5px",
          background: "linear-gradient(135deg, var(--text-1) 30%, var(--accent) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          lineHeight: 1.1,
          marginBottom: "10px",
        }}>
          Customer Summary
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: "1rem" }}>
          Real-time analytics for your WhatsApp Automation
        </p>
        <LiveBadge />
      </div>

      {/* Metric Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
        gap: "20px",
        marginBottom: "20px",
      }}>
        {METRICS.map((m, i) => (
          <MetricCard key={m.key} metric={m} value={data[m.key]} delay={(i + 1) * 80} />
        ))}
      </div>

      {/* Repeat Rate Bar */}
      <RepeatRateBar percent={data.repeat_percentage} />

      {/* Uploader */}
      <Uploader />
    </div>
  );
}
