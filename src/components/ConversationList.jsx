import React, { useMemo, useState } from "react";
import { Search, User } from "lucide-react";
import Avatar from "./Avatar";

const AVATAR_COLORS = ["#ff634e", "#0F6E56", "#534AB7", "#993C1D", "#185FA5", "#854F0B"];
function colorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const LABEL_STYLES = {
  READY_TO_BUY:       { color: "#16a34a", bg: "#dcfce7", activeBg: "#16a34a" },
  GIFT_BUYER:         { color: "#d97706", bg: "#fef3c7", activeBg: "#d97706" },
  EXPLORING:          { color: "#64748b", bg: "#f1f5f9", activeBg: "#64748b" },
  NEEDS_CONSULTATION: { color: "#7c3aed", bg: "#ede9fe", activeBg: "#7c3aed" },
  EXISTING_CUSTOMER:  { color: "#2563eb", bg: "#dbeafe", activeBg: "#2563eb" },
  ORDER_FOLLOWUP:     { color: "#ea580c", bg: "#ffedd5", activeBg: "#ea580c" },
  NOT_INTERESTED:     { color: "#dc2626", bg: "#fee2e2", activeBg: "#dc2626" },
  JOB_INQUIRY:        { color: "#059669", bg: "#d1fae5", activeBg: "#059669" },
  OUTSIDE_COVERAGE:   { color: "#db2777", bg: "#fce7f3", activeBg: "#db2777" },
  FOLLOW_UP:          { color: "#c2410c", bg: "#fff7ed", activeBg: "#c2410c" },
};

function getLabelStyle(label) {
  if (!label) return { color: "#64748b", bg: "#f1f5f9", activeBg: "#64748b" };
  const key = label.toUpperCase().replace(/\s+/g, "_");
  return LABEL_STYLES[key] || { color: "#64748b", bg: "#f1f5f9", activeBg: "#64748b" };
}

function LabelPill({ label }) {
  const style = getLabelStyle(label);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      background: style.bg,
      color: style.color,
      fontSize: 11,
      fontWeight: 500,
      padding: "2px 8px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.color, flexShrink: 0 }} />
      {label.replace(/_/g, " ")}
    </span>
  );
}

export default function ConversationList({ leads, activeId, onSelect, loading, error }) {
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState(null);

  const allLabels = useMemo(() => {
    return leads
      .map((l) => l.label)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }, [leads]);

  const filtered = useMemo(() => {
    let result = leads;
    if (activeLabel) result = result.filter((l) => l.label === activeLabel);
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(s) ||
          l.phone.toLowerCase().includes(s) ||
          (l.label || "").toLowerCase().includes(s)
      );
    }
    return result;
  }, [leads, search, activeLabel]);

  return (
    <div className="reva-sidebar">
      {/* Header */}
      <div className="reva-sidebar-header">
        <div className="reva-brand">
          <div className="reva-brand-mark">R</div>
          <div>
            <div className="reva-brand-name">Parfumea</div>
            <div className="reva-brand-sub">WhatsApp inbox · powered by REVA</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="reva-search-wrap">
        <div className="reva-search">
          <Search size={15} className="reva-search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or filter by name"
          />
        </div>
      </div>

      {/* WhatsApp-style filter tabs */}
      <div style={{
        overflowX: "auto",
        padding: "8px 12px",
        display: "flex",
        gap: 8,
        borderBottom: "1px solid #ececec",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
        {/* All tab */}
        <button
          onClick={() => setActiveLabel(null)}
          style={{
            flexShrink: 0,
            padding: "5px 14px",
            borderRadius: 999,
            border: !activeLabel ? "none" : "1.5px solid #e2e8f0",
            background: !activeLabel ? "#ff634e" : "transparent",
            color: !activeLabel ? "#fff" : "#64748b",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          All {leads.length > 0 && <span style={{ opacity: 0.8 }}>{leads.length}</span>}
        </button>

        {/* Label tabs */}
        {allLabels.map((label) => {
          const style = getLabelStyle(label);
          const isActive = activeLabel === label;
          const count = leads.filter((l) => l.label === label).length;
          return (
            <button
              key={label}
              onClick={() => setActiveLabel(isActive ? null : label)}
              style={{
                flexShrink: 0,
                padding: "5px 14px",
                borderRadius: 999,
                border: isActive ? "none" : `1.5px solid ${style.color}33`,
                background: isActive ? style.activeBg : style.bg,
                color: isActive ? "#fff" : style.color,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {label.replace(/_/g, " ")}
              <span style={{
                background: isActive ? "#ffffff33" : style.color + "22",
                color: isActive ? "#fff" : style.color,
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 999,
                padding: "1px 6px",
                lineHeight: 1.4,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conversation list */}
      <div className="reva-list">
        {loading && <div className="reva-empty-state">Loading conversations…</div>}
        {error && <div className="reva-empty-state reva-error">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="reva-empty-state">
            {activeLabel
              ? `No chats labeled "${activeLabel.replace(/_/g, " ")}"`
              : "No conversations found."}
          </div>
        )}
        {filtered.map((lead) => (
          <div
            key={lead.id}
            className={`reva-list-item ${lead.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(lead.id)}
          >
            <Avatar name={lead.name} color={colorForId(lead.id)} />
            <div className="reva-list-item-body">
              <div className="reva-list-item-top">
                <span className="reva-list-item-name">{lead.name}</span>
                <span className="reva-list-item-time">{formatTime(lead.lastMessageAt)}</span>
              </div>
              <div className="reva-list-item-meta">
                {lead.label && <LabelPill label={lead.label} />}
                {lead.humanTakeover && (
                  <span className="reva-takeover-tag">
                    <User size={11} /> You're handling this
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
