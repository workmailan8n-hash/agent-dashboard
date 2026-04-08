// Called by sprint.bat AFTER the autonomous agent commits its work to
// sprint-staging. Creates a snapshot branch + tag, pushes both, and opens a
// Pull Request on GitHub (without merging) so Railway spins up a PR environment.
//
// Prints a single JSON line to stdout: { tag, branch, prNumber, prUrl }
// so sprint.bat can pass the data to sprint-tg.js.

require("dotenv").config();
const { execSync } = require("child_process");
const path = require("path");

const REPO_DIR = __dirname;
const STAGING = "sprint-staging";
const BASE = "master";
const REPO_SLUG = "workmailan8n-hash/agent-dashboard";

function git(cmd) {
  return execSync(`git ${cmd}`, {
    cwd: REPO_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fmtTs() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

async function openPullRequest(branch, tag) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set in .env");

  // Grab last commit subject for PR title.
  const subject = git(`log -1 --format=%s`);
  const title = `Sprint ${tag}: ${subject}`.slice(0, 140);
  const body = [
    `Automated sprint snapshot.`,
    ``,
    `Tag: \`${tag}\``,
    `Branch: \`${branch}\``,
    `Base: \`${BASE}\``,
    ``,
    `**Do not merge via GitHub UI.** This PR exists only to spin up a Railway preview environment.`,
    `Approve or revert through the Telegram report buttons.`,
  ].join("\n");

  const res = await fetch(`https://api.github.com/repos/${REPO_SLUG}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, head: branch, base: BASE }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `GitHub PR create failed ${res.status}: ${JSON.stringify(data).slice(0, 400)}`,
    );
  }
  return { prNumber: data.number, prUrl: data.html_url };
}

(async () => {
  try {
    // Ensure we are on staging and have the latest agent commit.
    git(`checkout ${STAGING}`);

    const sha = git("rev-parse HEAD");
    const baseSha = git(`merge-base ${BASE} HEAD`);
    if (sha === baseSha) {
      console.log(
        JSON.stringify({ skip: true, reason: "no new commits on staging" }),
      );
      return;
    }

    const tag = `sprint-${fmtTs()}`;
    const branch = `sprint/${fmtTs()}`;

    // Create tag + snapshot branch pointing at current staging HEAD.
    git(`tag ${tag}`);
    git(`branch ${branch}`);

    // Push staging (with latest agent commit), tag, and snapshot branch.
    git(`push origin ${STAGING}`);
    git(`push origin ${tag}`);
    git(`push origin ${branch}`);

    // Open PR so Railway spins up a preview env.
    const pr = await openPullRequest(branch, tag);

    console.log(JSON.stringify({ ok: true, tag, branch, sha, ...pr }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e.message || String(e) }));
    process.exit(1);
  }
})();
