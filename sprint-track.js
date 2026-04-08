#!/usr/bin/env node
// Парсит JSON-результат `claude -p --output-format json` и аппендит метрики в CSV.
// Usage: node sprint-track.js <path-to-json-log>

const fs = require("fs");
const path = require("path");

const logPath = process.argv[2];
if (!logPath) {
  console.error("usage: node sprint-track.js <log.json>");
  process.exit(1);
}

const csvPath = path.join(path.dirname(logPath), "..", "sprint-usage.csv");

let raw;
try {
  raw = fs.readFileSync(logPath, "utf8");
} catch (e) {
  console.error("cannot read log:", e.message);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch {
  // claude -p может выдать массив stream-json или одиночный объект
  // попробуем последнюю строку
  const lines = raw.trim().split("\n").filter(Boolean);
  try {
    data = JSON.parse(lines[lines.length - 1]);
  } catch (e) {
    console.error("cannot parse JSON from log:", e.message);
    process.exit(1);
  }
}

// Поля могут отличаться по версии CLI; пробуем несколько вариантов
const usage = data.usage || data.result?.usage || {};
const cost =
  data.total_cost_usd ?? data.cost_usd ?? data.result?.total_cost_usd ?? null;
const inputTokens = usage.input_tokens ?? usage.inputTokens ?? null;
const outputTokens = usage.output_tokens ?? usage.outputTokens ?? null;
const cacheRead = usage.cache_read_input_tokens ?? null;
const cacheCreate = usage.cache_creation_input_tokens ?? null;
const duration = data.duration_ms ?? data.result?.duration_ms ?? null;
const numTurns = data.num_turns ?? data.result?.num_turns ?? null;
const isError = data.is_error ?? false;

const ts = new Date().toISOString();
const row = [
  ts,
  path.basename(logPath),
  cost ?? "",
  inputTokens ?? "",
  outputTokens ?? "",
  cacheRead ?? "",
  cacheCreate ?? "",
  duration ?? "",
  numTurns ?? "",
  isError ? "ERROR" : "OK",
].join(",");

const header =
  "timestamp,log_file,cost_usd,input_tokens,output_tokens,cache_read,cache_create,duration_ms,num_turns,status\n";

if (!fs.existsSync(csvPath)) {
  fs.writeFileSync(csvPath, header);
}
fs.appendFileSync(csvPath, row + "\n");

console.log(
  `tracked: cost=$${cost ?? "?"} in=${inputTokens} out=${outputTokens} status=${isError ? "ERROR" : "OK"}`,
);
