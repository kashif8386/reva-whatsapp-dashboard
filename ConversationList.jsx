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

export default function ConversationList({ leads, activeId, onSelect, loading, error }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const s = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        l.phone.toLowerCase().includes(s) ||
        (l.label || "").toLowerCase().includes(s)
    );
  }, [leads, search]);

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

      <div className="reva-list">
        {loading && <div className="reva-empty-state">Loading conversations…</div>}
        {error && <div className="reva-empty-state reva-error">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="reva-empty-state">No conversations found.</div>
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
                {lead.label && <span className="reva-pill">{lead.label}</span>}
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
