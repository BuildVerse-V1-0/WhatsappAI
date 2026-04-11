import { useState, useRef, useEffect, useCallback } from "react";

// ─── Config ─────────────────────────────────────────────────────────────────
// Path to the JSON file produced by dashboard_module.generate_json_report().
// Adjust if your build tool serves it from a different location.
const SUMMARY_JSON_URL = "/customer_summary.json";

// Polling interval in ms — set to 0 to disable auto-refresh.
const REFRESH_INTERVAL_MS = 60_000; // refresh every 60 s

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
  @keyframes pulse-ring {
    0%   { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes skeletonPulse {
    0%, 100% { opacity: 0.04; }
    50%       { opacity: 0.10; }
  }
`;

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

// ─── Skeleton Card (loading state) ──────────────────────────────────────────
function SkeletonCard({ delay }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "18px",
      padding: "26px 24px",
      animation: `fadeUp 0.5s ease ${delay}ms both`,
    }}>
      {["40%", "65%"].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? "10px" : "36px",
          width: w,
          borderRadius: "6px",
          background: "#fff",
          marginBottom: i === 0 ? "14px" : 0,
          animation: "skeletonPulse 1.6s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

// ─── Error Banner ────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{
      background: "var(--danger-dim)",
      border: "1px solid rgba(248,81,73,0.25)",
      borderRadius: "14px",
      padding: "18px 22px",
      marginBottom: "24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "1.1rem" }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--danger)" }}>
            Failed to load summary
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-2)", marginTop: "2px" }}>
            {message}
          </div>
        </div>
      </div>
      <button onClick={onRetry} style={{
        background: "var(--danger)",
        color: "#fff",
        border: "none",
        padding: "8px 18px",
        borderRadius: "8px",
        fontWeight: 600,
        fontSize: "0.85rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        Retry
      </button>
    </div>
  );
}

// ─── Review Link ─────────────────────────────────────────────────────────────
function ReviewLink() {
  const STORAGE_KEY = "wa_review_link";
  const [link, setLink]         = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [draft, setDraft]       = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [copyState, setCopyState] = useState("idle"); // idle | copied
  const [editing, setEditing]   = useState(!localStorage.getItem(STORAGE_KEY));

  const isValidUrl = (val) => {
    try { new URL(val); return true; } catch { return false; }
  };

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed || !isValidUrl(trimmed)) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    setLink(trimmed);
    setEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    });
  };

  // Opens WhatsApp with a pre-filled message containing the review link.
  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `We'd love your feedback! 🙏\nLeave us a quick review here:\n${link}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div style={{
      marginTop: "24px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "18px",
      padding: "28px 28px",
      animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 760ms both",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "1.15rem", marginBottom: "5px" }}>
            ⭐ Review Link
          </h3>
          <p style={{ color: "var(--text-2)", fontSize: "0.88rem" }}>
            Save your Google / Trustpilot review URL and share it with customers over WhatsApp.
          </p>
        </div>
        {link && !editing && (
          <button onClick={() => setEditing(true)} style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-2)",
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
          }}>
            Edit
          </button>
        )}
      </div>

      {/* Input row */}
      {editing ? (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="https://g.page/r/your-review-link"
            style={{
              flex: 1,
              minWidth: "220px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${isValidUrl(draft) || !draft ? "var(--border)" : "var(--danger)"}`,
              borderRadius: "10px",
              padding: "11px 16px",
              color: "var(--text-1)",
              fontSize: "0.9rem",
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button onClick={handleSave} disabled={!isValidUrl(draft.trim())} style={{
            background: isValidUrl(draft.trim()) ? "var(--accent)" : "rgba(255,255,255,0.05)",
            color: isValidUrl(draft.trim()) ? "#000" : "var(--text-2)",
            border: "none",
            padding: "11px 22px",
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: isValidUrl(draft.trim()) ? "pointer" : "default",
            fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
          }}>
            Save
          </button>
          {link && (
            <button onClick={() => setEditing(false)} style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              padding: "11px 18px",
              borderRadius: "10px",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Cancel
            </button>
          )}
        </div>
      ) : link ? (
        <div>
          {/* Saved link display */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            overflow: "hidden",
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: "var(--accent)", flexShrink: 0 }}>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span style={{
              fontSize: "0.85rem",
              color: "var(--accent)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}>
              {link}
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {/* Copy */}
            <button onClick={handleCopy} style={{
              display: "flex", alignItems: "center", gap: "7px",
              background: copyState === "copied" ? "var(--success-dim)" : "var(--accent-dim)",
              border: `1px solid ${copyState === "copied" ? "rgba(63,185,80,0.3)" : "rgba(88,166,255,0.2)"}`,
              color: copyState === "copied" ? "var(--success)" : "var(--accent)",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.25s",
            }}>
              {copyState === "copied" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>

            {/* Share via WhatsApp */}
            <button onClick={handleWhatsApp} style={{
              display: "flex", alignItems: "center", gap: "7px",
              background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.25)",
              color: "#25d366",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(37,211,102,0.18)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(37,211,102,0.1)"}
            >
              {/* WhatsApp icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#25d366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              Share via WhatsApp
            </button>

            {/* Open link */}
            <a href={link} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "center", gap: "7px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-2)",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.88rem",
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Preview
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Inject global styles once.
  useEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = globalStyles;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  // ── Fetch customer_summary.json ──────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Add cache-busting query param so the browser never serves a stale file.
      const res = await fetch(`${SUMMARY_JSON_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
      const json = await res.json();

      // Basic shape validation — all required keys must be present.
      const required = [
        "total_customers", "repeat_customers", "new_customers",
        "pending_payments", "inactive_customers",
        "repeat_percentage", "total_pending_amount",
      ];
      const missing = required.filter((k) => !(k in json));
      if (missing.length) throw new Error(`JSON missing fields: ${missing.join(", ")}`);

      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load.
  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Auto-refresh polling.
  useEffect(() => {
    if (!REFRESH_INTERVAL_MS) return;
    const id = setInterval(fetchSummary, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchSummary]);

  const displayData = data || {};

  return (
    <div style={{ minHeight: "100vh", padding: "48px 20px", maxWidth: "1040px", margin: "0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "44px", animation: "fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0ms both" }}>
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

        {/* Live badge + last updated + refresh */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "10px" }}>
          <LiveBadge />
          {lastUpdated && (
            <span style={{ color: "var(--text-2)", fontSize: "0.76rem" }}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchSummary}
            disabled={loading}
            title="Refresh data"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "4px 10px",
              cursor: loading ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: "5px",
              color: "var(--text-2)",
              fontSize: "0.76rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {error && <ErrorBanner message={error} onRetry={fetchSummary} />}

      {/* ── Metric Grid ────────────────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
        gap: "20px",
        marginBottom: "20px",
      }}>
        {loading && !data
          ? METRICS.map((_, i) => <SkeletonCard key={i} delay={(i + 1) * 80} />)
          : METRICS.map((m, i) => (
              <MetricCard key={m.key} metric={m} value={displayData[m.key] ?? 0} delay={(i + 1) * 80} />
            ))
        }
      </div>

      {/* ── Repeat Rate Bar ────────────────────────────────────────────── */}
      {!loading && data && (
        <RepeatRateBar percent={data.repeat_percentage} />
      )}
      {loading && !data && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "18px", padding: "22px 24px", height: "74px",
          animation: "skeletonPulse 1.6s ease-in-out infinite",
        }} />
      )}

      {/* ── Review Link ────────────────────────────────────────────────── */}
      <ReviewLink />

      {/* ── Image Uploader ─────────────────────────────────────────────── */}
      <Uploader />
    </div>
  );
}
