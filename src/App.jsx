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

// How often to re-fetch the lead list and active thread, in milliseconds.
// This is a simple polling approach — good enough for a single client at
// moderate volume. If this becomes a bottleneck later, swap polling for
// Airtable webhooks or a websocket relay from n8n.
const POLL_INTERVAL_MS = 8000;

export default function App() {
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

  // Initial load + polling for the lead list
  useEffect(() => {
    loadLeads();
    const interval = setInterval(loadLeads, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadLeads]);

  // Load messages whenever the active conversation changes, then poll it
  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeId, loadMessages]);

  const activeLead = leads.find((l) => l.id === activeId) || null;

  const handleSelect = (id) => {
    setActiveId(id);
    setShowMobileThread(true);
  };

  const handleSendReply = async (text) => {
    if (!activeLead) return;
    setSending(true);
    // Optimistic UI: show the message immediately while the request is in flight.
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      text,
      sender: "client",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendManualReply(activeLead.id, text);
      // The n8n workflow will pick up Send Reply = true, send it on WhatsApp,
      // log it properly to Messages, and reset the fields. We re-fetch shortly
      // after to replace the optimistic message with the real record.
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
    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === activeLead.id ? { ...l, humanTakeover: newValue } : l))
    );
    try {
      await setHumanTakeover(activeLead.id, newValue);
    } catch (err) {
      console.error("Failed to update takeover status:", err);
      // Revert on failure
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
