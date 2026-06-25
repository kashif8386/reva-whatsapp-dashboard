import React, { useEffect, useState, useCallback } from "react";
import ConversationList from "./components/ConversationList";
import ChatThread from "./components/ChatThread";
import {
  fetchLeads,
  fetchMessagesForLead,
  sendManualReply,
  setHumanTakeover,
} from "./api/airtable";
import "./App.css";

const POLL_INTERVAL_MS = 8000;

const VALID_USER = import.meta.env.VITE_DASHBOARD_USER || "hassan";
const VALID_PASS = import.meta.env.VITE_DASHBOARD_PASS || "parfumea2026";

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (username === VALID_USER && password === VALID_PASS) {
        sessionStorage.setItem("reva_auth", "1");
        onLogin();
      } else {
        setError("Incorrect username or password.");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, Inter, sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "#ff634e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            margin: "0 auto 16px",
          }}>R</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#0a0a0a" }}>Parfumea Inbox</div>
          <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>powered by REVA</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: "1px solid #e2e2e2",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: "1px solid #e2e2e2",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#fdf1ef",
              color: "#ff634e",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 16,
              textAlign: "center",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              background: loading ? "#ffb3a7" : "#ff634e",
              color: "#fff",
              border: "none",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem("reva_auth"));
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      const data = await fetchLeads();
      setLeads(data);
      setLeadsError(null);
    } catch (err) {
      setLeadsError(err.message);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (leadId) => {
    if (!leadId) return;
    setMessagesLoading(true);
    try {
      const data = await fetchMessagesForLead(leadId);
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadLeads();
    const interval = setInterval(loadLeads, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadLeads, authed]);

  useEffect(() => {
    if (!activeId || !authed) return;
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeId, loadMessages, authed]);

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  const activeLead = leads.find((l) => l.id === activeId) || null;

  const handleSelect = (id) => {
    setActiveId(id);
    setShowMobileThread(true);
  };

  const handleSendReply = async (text) => {
    if (!activeLead) return;
    setSending(true);
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      text,
      sender: "client",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    try {
      await sendManualReply(activeLead.id, text);
      setTimeout(() => loadMessages(activeLead.id), 3000);
    } catch (err) {
      console.error("Failed to send reply:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      alert("Couldn't send that reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleToggleTakeover = async () => {
    if (!activeLead) return;
    const newValue = !activeLead.humanTakeover;
    setLeads((prev) =>
      prev.map((l) => (l.id === activeLead.id ? { ...l, humanTakeover: newValue } : l))
    );
    try {
      await setHumanTakeover(activeLead.id, newValue);
    } catch (err) {
      console.error("Failed to update takeover status:", err);
      setLeads((prev) =>
        prev.map((l) => (l.id === activeLead.id ? { ...l, humanTakeover: !newValue } : l))
      );
    }
  };

  return (
    <div className="reva-app">
      <div className={`reva-sidebar-wrap ${showMobileThread ? "mobile-hidden" : ""}`}>
        <ConversationList
          leads={leads}
          activeId={activeId}
          onSelect={handleSelect}
          loading={leadsLoading}
          error={leadsError}
        />
      </div>
      <div className={`reva-thread-wrap ${showMobileThread ? "" : "mobile-hidden"}`}>
        <ChatThread
          lead={activeLead}
          messages={messages}
          loading={messagesLoading}
          onSendReply={handleSendReply}
          onToggleTakeover={handleToggleTakeover}
          onBack={() => setShowMobileThread(false)}
          sending={sending}
        />
      </div>
    </div>
  );
}
