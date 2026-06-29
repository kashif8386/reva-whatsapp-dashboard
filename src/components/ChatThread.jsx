import React, { useEffect, useRef, useState } from "react";
import { Send, ChevronLeft, Bot, User, CheckCheck, Paperclip, X } from "lucide-react";
import Avatar from "./Avatar";

const CLOUDINARY_CLOUD = "dvcewwcu6";
const CLOUDINARY_PRESET = "parfumea_unsigned";

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
              style={{ maxWidth: 240, maxHeight: 240, borderRadius: 10, display: "block", cursor: "pointer" }}
              onClick={() => window.open(msg.text.trim(), "_blank")}
              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
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

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  formData.append("folder", "parfumea-whatsapp");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url;
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
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!lead) {
    return <div className="reva-thread-empty">Select a conversation to view the chat</div>;
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const handleSend = async () => {
    if (sending || uploadingImage) return;

    if (imageFile) {
      setUploadingImage(true);
      try {
        const cloudinaryUrl = await uploadToCloudinary(imageFile);
        await onSendReply(cloudinaryUrl);
        clearImage();
      } catch (err) {
        alert("Failed to upload image. Please try again.");
      } finally {
        setUploadingImage(false);
      }
      return;
    }

    if (!reply.trim()) return;
    onSendReply(reply.trim());
    setReply("");
  };

  const isLoading = sending || uploadingImage;

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

        {/* Image preview */}
        {imagePreview && (
          <div style={{
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#f9f9f9",
            borderTop: "1px solid #ececec",
          }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8 }}
            />
            <span style={{ fontSize: 12, color: "#666", flex: 1 }}>
              {uploadingImage ? "Uploading..." : "Ready to send"}
            </span>
            {!uploadingImage && (
              <button onClick={clearImage} style={{ background: "none", border: "none", cursor: "pointer", color: "#999" }}>
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="reva-composer-row">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          {/* Paperclip button */}
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={isLoading}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
            }}
            title="Attach image"
          >
            <Paperclip size={18} />
          </button>

          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !imageFile && handleSend()}
            placeholder={imageFile ? "Add a caption (optional)..." : "Type a reply to send on WhatsApp..."}
            disabled={isLoading}
          />
          <button
            className="reva-send-btn"
            onClick={handleSend}
            disabled={isLoading || (!reply.trim() && !imageFile)}
            aria-label="Send reply"
          >
            {isLoading ? (
              <div style={{ width: 17, height: 17, border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <Send size={17} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
