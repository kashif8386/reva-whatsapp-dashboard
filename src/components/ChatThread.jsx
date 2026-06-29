import React, { useEffect, useRef, useState } from "react";
import { Send, ChevronLeft, Bot, User, CheckCheck } from "lucide-react";
import Avatar from "./Avatar";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isImageUrl(text) {
  if (!text) return false;
  const cleaned = text.trim();
  return (
    cleaned.includes('res.cloudinary.com') ||
    cleaned.includes('lookaside.fbsbx.com') ||
    /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(cleaned)
  );
}

function MessageBubble({ msg }) {
  const isCustomer = msg.sender === "customer";
  const isAI = msg.sender === "ai agent" || msg.sender === "ai";
  const isClient = msg.sender === "client";
  const isImage = isImageUrl(msg.text);

  return (
    <div className={`reva-bubble-row ${isCustomer ? "from-customer" : "from-us"}`}>
      {!isCustomer && (
        <div className="reva-bubble-sender">
          {isAI ? <Bot size={12} /> : <User size={12} />}
          <span>{isAI ? "AI Agent" : "You (Parfumea)"}</span>
        </div>
      )}
      <div
        className={`reva-bubble ${isCustomer ? "bubble-customer" : isAI ? "bubble-ai" : "bubble-client"}`}
        style={isImage ? { padding: 4, background: "transparent", boxShadow: "none" } : {}}
      >
        {isImage ? (
          <>
            <img
              src={msg.text.trim()}
              alt="Shared image"
              style={{
                maxWidth: 240,
                maxHeight: 240,
                borderRadius: 10,
                display: "block",
                cursor: "pointer",
              }}
              onClick={() => window.open(msg.text.trim(), "_blank")}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
            <span style={{ display: "none", fontSize: 13, color: "#999" }}>📷 Image (unavailable)</span>
          </>
        ) : (
          msg.text
        )}
      </div>
      <div className="reva-bubble-time">
        {formatTime(msg.timestamp)}
        {!isCustomer && <CheckCheck size={12} className="reva-check" />}
      </div>
    </div>
  );
}

export default function ChatThread({
  lead,
  messages,
  loading,
  onSendReply,
  onToggleTakeover,
  onBack,
  sending,
}) {
  const [reply, setReply] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!lead) {
    return <div className="reva-thread-empty">Select a conversation to view the chat</div>;
  }

  const handleSend = () => {
    if (!reply.trim() || sending) return;
    onSendReply(reply.trim());
    setReply("");
  };

  return (
    <div className="reva-thread">
      <div className="reva-thread-header">
        <ChevronLeft size={20} className="reva-back-btn" onClick={onBack} />
        <Avatar name={lead.name} size={38} />
        <div className="reva-thread-header-info">
          <div className="reva-thread-name">{lead.name}</div>
          <div className="reva-thread-phone">{lead.phone}</div>
        </div>
        <button
          className={`reva-takeover-btn ${lead.humanTakeover ? "active" : ""}`}
          onClick={onToggleTakeover}
        >
          {lead.humanTakeover ? "Hand back to AI" : "Take over chat"}
        </button>
      </div>

      <div className="reva-thread-body" ref={scrollRef}>
        {loading && <div className="reva-empty-state">Loading messages…</div>}
        {!loading && messages.length === 0 && (
          <div className="reva-empty-state">No messages yet in this conversation.</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
      </div>

      <div className="reva-composer">
        {!lead.humanTakeover && (
          <div className="reva-composer-hint">
            <Bot size={13} /> AI is replying automatically. Type below to jump in anytime.
          </div>
        )}
        <div className="reva-composer-row">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a reply to send on WhatsApp..."
            disabled={sending}
          />
          <button className="reva-send-btn" onClick={handleSend} disabled={sending} aria-label="Send reply">
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
