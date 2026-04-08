// Receives Railway deploy webhooks and stores preview URLs for PR environments.
// Railway webhook payload shape is not rigorously documented — we log the first
// few raw payloads and extract fields defensively.

const log = require("../logger");
const previewStore = require("../sprint-preview-store");

let rawLogCount = 0;
const MAX_RAW_LOGS = 5;

function pickUrl(payload) {
  // Try common field paths where Railway might put the deployment URL.
  return (
    payload?.deployment?.staticUrl ||
    payload?.deployment?.url ||
    payload?.deployment?.meta?.staticUrl ||
    payload?.staticUrl ||
    payload?.url ||
    (payload?.deployment?.domains && payload.deployment.domains[0]) ||
    null
  );
}

function pickPrNumber(payload) {
  return (
    payload?.environment?.meta?.prNumber ||
    payload?.environment?.prNumber ||
    payload?.pullRequest?.number ||
    payload?.prNumber ||
    null
  );
}

function pickBranch(payload) {
  return (
    payload?.deployment?.meta?.branch ||
    payload?.environment?.meta?.branch ||
    payload?.branch ||
    null
  );
}

function pickStatus(payload) {
  return payload?.deployment?.status || payload?.status || null;
}

function handleRailwayWebhook(req, res) {
  let body = "";
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > 1e6) {
      res.writeHead(413);
      res.end('{"error":"Payload too large"}');
      req.destroy();
      return;
    }
    body += chunk;
  });
  req.on("end", () => {
    try {
      const payload = JSON.parse(body || "{}");

      // Log first few raw payloads to understand schema empirically.
      if (rawLogCount < MAX_RAW_LOGS) {
        rawLogCount++;
        log.info(
          `[railway-webhook] raw #${rawLogCount}: ${body.slice(0, 2000)}`,
        );
      }

      const url = pickUrl(payload);
      const prNumber = pickPrNumber(payload);
      const branch = pickBranch(payload);
      const status = pickStatus(payload);
      const envId = payload?.environment?.id || null;

      if (!url) {
        log.info(
          `[railway-webhook] no URL in payload (status=${status}, branch=${branch})`,
        );
      } else {
        // Store under multiple keys so sprint-tg.js can look up by whatever it has.
        const record = { url, status, environmentId: envId, branch, prNumber };
        if (prNumber) previewStore.set(`pr:${prNumber}`, record);
        if (branch) previewStore.set(`branch:${branch}`, record);
        // Mark most-recent PR deploy for fallback reads.
        previewStore.set("latest", record);
        log.info(
          `[railway-webhook] stored preview url=${url} branch=${branch} pr=${prNumber} status=${status}`,
        );
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      log.warn("[railway-webhook] parse error: " + e.message);
      res.writeHead(400);
      res.end('{"error":"bad json"}');
    }
  });
}

module.exports = { handleRailwayWebhook };
