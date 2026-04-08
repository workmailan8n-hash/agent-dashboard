// Sprint approval / revert via GitHub API.
// Called by telegram.js when the user presses ✅ Підтвердити or ❌ Відкотити.
// No local git required — all operations go through GitHub REST API.

const log = require("./logger");

const REPO_SLUG = "workmailan8n-hash/agent-dashboard";
const BASE = "master";

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

// tag = "sprint-2026-04-08_23-31"  →  branch = "sprint/2026-04-08_23-31"
function tagToBranch(tag) {
  return tag.replace(/^sprint-/, "sprint/");
}

async function findOpenPR(branch) {
  const url = `https://api.github.com/repos/${REPO_SLUG}/pulls?head=${REPO_SLUG.split("/")[0]}:${branch}&state=open&per_page=5`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`GitHub list PRs ${res.status}`);
  const list = await res.json();
  return list[0] || null;
}

// Approve: merge the sprint PR into master via GitHub API.
async function approveSprint(tag) {
  try {
    const branch = tagToBranch(tag);
    log.info(`[sprint-git] approve tag=${tag} branch=${branch}`);

    const pr = await findOpenPR(branch);
    if (!pr) {
      // PR may already be merged or closed.
      log.warn(`[sprint-git] no open PR for branch ${branch}`);
      return { ok: false, error: `no open PR for branch ${branch}` };
    }

    const mergeRes = await fetch(
      `https://api.github.com/repos/${REPO_SLUG}/pulls/${pr.number}/merge`,
      {
        method: "PUT",
        headers: githubHeaders(),
        body: JSON.stringify({
          commit_title: `chore: approve sprint ${tag}`,
          merge_method: "squash",
        }),
      },
    );
    const mergeData = await mergeRes.json();
    if (!mergeRes.ok) {
      log.warn(`[sprint-git] merge failed: ${JSON.stringify(mergeData)}`);
      return {
        ok: false,
        error: `merge failed (${mergeRes.status}): ${mergeData.message || ""}`,
      };
    }
    log.info(
      `[sprint-git] merged PR #${pr.number} sha=${mergeData.sha?.slice(0, 8)}`,
    );
    return {
      ok: true,
      strategy: "squash",
      sha: mergeData.sha,
      prNumber: pr.number,
    };
  } catch (e) {
    log.warn(`[sprint-git] approveSprint error: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

// Revert: close the PR without merging (sprint changes stay on staging but don't reach master).
async function revertSprint(tag) {
  try {
    const branch = tagToBranch(tag);
    log.info(`[sprint-git] revert tag=${tag} branch=${branch}`);

    const pr = await findOpenPR(branch);
    if (!pr) {
      log.warn(`[sprint-git] no open PR for branch ${branch}`);
      return { ok: false, error: `no open PR for branch ${branch}` };
    }

    const closeRes = await fetch(
      `https://api.github.com/repos/${REPO_SLUG}/pulls/${pr.number}`,
      {
        method: "PATCH",
        headers: githubHeaders(),
        body: JSON.stringify({ state: "closed" }),
      },
    );
    if (!closeRes.ok) {
      const d = await closeRes.json();
      return {
        ok: false,
        error: `close PR failed: ${d.message || closeRes.status}`,
      };
    }
    log.info(`[sprint-git] closed PR #${pr.number}`);
    return { ok: true, tag, prNumber: pr.number };
  } catch (e) {
    log.warn(`[sprint-git] revertSprint error: ${e.message}`);
    return { ok: false, error: e.message };
  }
}

module.exports = { approveSprint, revertSprint };
