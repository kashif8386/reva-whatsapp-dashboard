import React, { useMemo, useState } from "react";
import { Search, User, X } from "lucide-react";
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

// Label colors matching the AI's label categories
const LABEL_COLORS = {
  READY_TO_BUY:       { bg: "#dcfce7", text: "#166534", dot: "#22c55e" },
  GIFT_BUYER:         { bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
  EXPLORING:          { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" },
  NEEDS_CONSULTATION: { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
  EXISTING_CUSTOMER:  { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  ORDER_FOLLOWUP:     { bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
  NOT_INTERESTED:     { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  JOB_INQUIRY:        { bg: "#f0fdf4", text: "#166534", dot: "#4ade80" },
  OUTSIDE_COVERAGE:   { bg: "#fce7f3", text: "#9d174d", dot: "#ec4899" },
  FOLLOW_UP:          { bg: "#fff7ed", text: "#9a3412", dot: "#fb923c" },
};

function getLabelColor(label) {
  if (!label) return null;
  const key = label.toUpperCase().replace(/\s+/g, "_");
  return LABEL_COLORS[key] || { bg: "#f1f5f9", text: "#475569", dot: "#94a3b8" };
}

function LabelPill({ label, small }) {
  const colors = getLabelColor(label);
  if (!colors) return null;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      background: colors.bg,
      color: colors.text,
      fontSize: small ? 10 : 11,
      fontWeight: 500,
      padding: small ? "2px 7px" : "3px 8px",
      borderRadius: 999,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot, flexShrink: 0 }} />
      {label.replace(/_/g, " ")}
    </span>
  );
}

export default function ConversationList({ leads, activeId, onSelect, loading, error }) {
  const [search, setSearch] = useState("");
  const [activeLabel, setActiveLabel] = useState(null);

  // Get unique labels from all leads
  const allLabels = useMemo(() => {
    const labels = leads
      .map((l) => l.label)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return labels;
  }, [leads]);

  const filtered = useMemo(() => {
    let result = leads;
    // Filter by active label
    if (activeLabel) {
      result = result.filter((l) => l.label === activeLabel);
    }
    // Filter by search
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
      <div className="reva-sidebar-header">
        <div className="reva-brand">
          <div className="reva-brand-mark">R</div>
          <div>
            <div className="reva-brand-name">Parfumea</div>
            <div className="reva-brand-sub">WhatsApp inbox · powered by REVA</div>
          </div>
        </div>
      </div>

      <div className="reva-search-wrap">
        <div className="reva-search">
          <Search size={15} className="reva-search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, or label"
          />
        </div>
      </div>

      {/* Label filter bar */}
      {allLabels.length > 0 && (
        <div style={{
          padding: "8px 12px",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          background: "#fafafa",
        }}>
          {/* All button */}
          <button
            onClick={() => setActiveLabel(null)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: !activeLabel ? "#0a0a0a" : "#f1f5f9",
              color: !activeLabel ? "#fff" : "#475569",
              fontSize: 11,
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            All
            <span style={{
              background: !activeLabel ? "#ffffff33" : "#e2e8f0",
              color: !activeLabel ? "#fff" : "#64748b",
              fontSize: 10,
              borderRadius: 999,
              padding: "0 5px",
              fontWeight: 600,
            }}>
              {leads.length}
            </span>
          </button>

          {/* Label buttons */}
          {allLabels.map((label) => {
            const count = leads.filter((l) => l.label === label).length;
            const colors = getLabelColor(label);
            const isActive = activeLabel === label;
            return (
              <button
                key={label}
                onClick={() => setActiveLabel(isActive ? null : label)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: isActive ? colors.text : colors.bg,
                  color: isActive ? "#fff" : colors.text,
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: isActive ? "#ffffff99" : colors.dot,
                  flexShrink: 0,
                }} />
                {label.replace(/_/g, " ")}
                <span style={{
                  background: isActive ? "#ffffff33" : "#00000011",
                  fontSize: 10,
                  borderRadius: 999,
                  padding: "0 5px",
                  fontWeight: 600,
                }}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Clear filter indicator */}
          {activeLabel && (
            <button
              onClick={() => setActiveLabel(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                background: "transparent",
                color: "#ff634e",
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 6px",
                borderRadius: 999,
                border: "1px solid #ff634e",
                cursor: "pointer",
              }}
            >
              <X size={10} /> Clear
            </button>
          )}
        </div>
      )}

      <div className="reva-list">
        {loading && <div className="reva-empty-state">Loading conversations…</div>}
        {error && <div className="reva-empty-state reva-error">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="reva-empty-state">
            {activeLabel ? `No chats labeled "${activeLabel.replace(/_/g, " ")}"` : "No conversations found."}
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
                {lead.label && <LabelPill label={lead.label} small />}
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
