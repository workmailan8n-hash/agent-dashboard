// Persistent store for Railway PR environment preview URLs.
// Populated by POST /railway-webhook handler, read by sprint-tg.js.
// Key: PR number OR sprint tag. Value: { url, status, environmentId, updatedAt }.

const fs = require("fs");
const path = require("path");
const log = require("./logger");

const STORE_FILE = path.join(__dirname, "..", "..", ".sprint-preview.json");

let store = {};
try {
  if (fs.existsSync(STORE_FILE)) {
    store = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  }
} catch (e) {
  log.warn("sprint-preview-store load failed: " + e.message);
  store = {};
}

function persist() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    log.warn("sprint-preview-store persist failed: " + e.message);
  }
}

function set(key, data) {
  store[String(key)] = { ...data, updatedAt: Date.now() };
  persist();
}

function get(key) {
  return store[String(key)] || null;
}

function all() {
  return { ...store };
}

function remove(key) {
  delete store[String(key)];
  persist();
}

module.exports = { set, get, all, remove };
