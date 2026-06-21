// src/api/airtable.js
//
// Thin wrapper around the Airtable REST API.
// Reads config from environment variables — see .env.example.
//
// Docs: https://airtable.com/developers/web/api/introduction

const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const LEADS_TABLE = import.meta.env.VITE_AIRTABLE_LEADS_TABLE || "Leads";
const MESSAGES_TABLE = import.meta.env.VITE_AIRTABLE_MESSAGES_TABLE || "Messages";

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

function assertConfigured() {
  if (!TOKEN || !BASE_ID) {
    throw new Error(
      "Airtable is not configured. Copy .env.example to .env and fill in VITE_AIRTABLE_TOKEN and VITE_AIRTABLE_BASE_ID."
    );
  }
}

async function airtableFetch(path, options = {}) {
  assertConfigured();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable API error (${res.status}): ${body}`);
  }

  return res.json();
}

// ---- Leads ----

/**
 * Fetch all Leads, sorted by Last Message At descending (most recent first).
 * Handles Airtable's pagination automatically.
 */
export async function fetchLeads() {
  let records = [];
  let offset;

  do {
    const params = new URLSearchParams({
      "sort[0][field]": "Last Message At",
      "sort[0][direction]": "desc",
      pageSize: "100",
    });
    if (offset) params.set("offset", offset);

    const data = await airtableFetch(`/${encodeURIComponent(LEADS_TABLE)}?${params.toString()}`);
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);

  return records.map(mapLeadRecord);
}

export async function updateLead(leadId, fields) {
  const data = await airtableFetch(`/${encodeURIComponent(LEADS_TABLE)}/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
  return mapLeadRecord(data);
}

function mapLeadRecord(record) {
  const f = record.fields;
  return {
    id: record.id,
    name: f["Contact Name"] || "Unknown",
    phone: f["Phone Number"] || "",
    status: f["Status"] || "",
    leadSource: f["Lead Source"] || "",
    label: f["Label"] || "",
    humanTakeover: !!f["Human Takeover"],
    pendingReply: f["Pending Reply"] || "",
    sendReply: !!f["Send Reply"],
    lastMessageAt: f["Last Message At"] || null,
  };
}

// ---- Messages ----

/**
 * Fetch all messages linked to a given Lead record, sorted oldest to newest.
 */
export async function fetchMessagesForLead(leadId) {
  const filterFormula = `{Lead} = '${leadId}'`;
  let records = [];
  let offset;

  do {
    const params = new URLSearchParams({
      filterByFormula: filterFormula,
      "sort[0][field]": "Timestamp",
      "sort[0][direction]": "asc",
      pageSize: "100",
    });
    if (offset) params.set("offset", offset);

    const data = await airtableFetch(`/${encodeURIComponent(MESSAGES_TABLE)}?${params.toString()}`);
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);

  return records.map(mapMessageRecord);
}

function mapMessageRecord(record) {
  const f = record.fields;
  return {
    id: record.id,
    text: f["Message Text"] || "",
    sender: (f["Sender"] || "Customer").toLowerCase(), // "customer" | "ai agent" | "client"
    timestamp: f["Timestamp"] || null,
  };
}

/**
 * Send a manual reply: writes Pending Reply + Send Reply = true onto the Lead.
 * An n8n workflow (Airtable Trigger watching Send Reply) picks this up,
 * sends it via the WhatsApp API, logs it to Messages, then resets these fields.
 */
export async function sendManualReply(leadId, text) {
  return updateLead(leadId, {
    "Pending Reply": text,
    "Send Reply": true,
  });
}

export async function setHumanTakeover(leadId, value) {
  return updateLead(leadId, { "Human Takeover": value });
}
