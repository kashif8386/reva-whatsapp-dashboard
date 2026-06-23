// src/api/airtable.js
//
// Thin wrapper around the Airtable REST API.
// Reads config from environment variables — see .env.example.

const TOKEN = import.meta.env.VITE_AIRTABLE_TOKEN;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const LEADS_TABLE = import.meta.env.VITE_AIRTABLE_LEADS_TABLE || "Leads";
const MESSAGES_TABLE = import.meta.env.VITE_AIRTABLE_MESSAGES_TABLE || "Messages";
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

function getHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

function checkConfig() {
  if (!TOKEN || !BASE_ID) {
    throw new Error(
      "Airtable is not configured. Copy .env.example to .env and fill in your credentials."
    );
  }
}

async function doFetch(path, options = {}) {
  checkConfig();
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
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
    const data = await doFetch(`/${encodeURIComponent(LEADS_TABLE)}?${params.toString()}`);
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records.map(mapLeadRecord);
}

export async function updateLead(leadId, fields) {
  const data = await doFetch(`/${encodeURIComponent(LEADS_TABLE)}/${leadId}`, {
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

export async function fetchMessagesForLead(leadId) {
  if (!leadId) return [];
  const filterFormula = `{Lead Record ID} = '${leadId}'`;
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
    const data = await doFetch(`/${encodeURIComponent(MESSAGES_TABLE)}?${params.toString()}`);
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
    sender: (f["Sender"] || "Customer").toLowerCase(),
    timestamp: f["Timestamp"] || null,
  };
}

export async function sendManualReply(leadId, text) {
  return updateLead(leadId, {
    "Pending Reply": text,
    "Send Reply": true,
  });
}

export async function setHumanTakeover(leadId, value) {
  return updateLead(leadId, { "Human Takeover": value });
}
