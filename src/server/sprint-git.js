// Git operations for sprint preview flow: approve (merge staging → master),
// revert (undo a sprint commit in staging), with a file-based lock so two
// simultaneous TG button presses can't collide.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const log = require("./logger");

const REPO_DIR = path.join(__dirname, "..", "..");
const LOCK_FILE = path.join(REPO_DIR, ".sprint.lock");
const STAGING_BRANCH = "sprint-staging";
const PROD_BRANCH = "master";

function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
    if (age < 5 * 60 * 1000) return false; // lock held < 5 min
    log.warn("[sprint-git] stale lock older than 5min, overriding");
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  return true;
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {}
}

function git(cmd) {
  return execSync(`git ${cmd}`, {
    cwd: REPO_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tryGit(cmd) {
  try {
    return { ok: true, out: git(cmd) };
  } catch (e) {
    return { ok: false, err: (e.stderr || e.message || "").toString() };
  }
}

// Approve: merge sprint-staging into master up to the given tag, push master.
// If no tag given, merge whole staging HEAD.
function approveSprint(tag) {
  if (!acquireLock()) return { ok: false, error: "lock held" };
  try {
    git("fetch --all --tags");
    git(`checkout ${PROD_BRANCH}`);
    git(`pull --ff-only origin ${PROD_BRANCH}`);

    const target = tag || STAGING_BRANCH;
    // Try fast-forward first
    let merge = tryGit(`merge --ff-only ${target}`);
    let strategy = "ff-only";
    if (!merge.ok) {
      // Fall back to a merge commit
      merge = tryGit(
        `merge --no-ff -m "chore: approve sprint ${target}" ${target}`,
      );
      strategy = "no-ff";
      if (!merge.ok) {
        tryGit("merge --abort");
        return {
          ok: false,
          error: `merge conflict: ${merge.err.slice(0, 500)}`,
        };
      }
    }
    const push = tryGit(`push origin ${PROD_BRANCH}`);
    if (!push.ok) return { ok: false, error: `push failed: ${push.err}` };

    const sha = git("rev-parse HEAD");
    return { ok: true, strategy, sha, target };
  } finally {
    releaseLock();
  }
}

// Revert: git revert the commit pointed to by the tag in sprint-staging, push staging.
function revertSprint(tag) {
  if (!acquireLock()) return { ok: false, error: "lock held" };
  try {
    git("fetch --all --tags");
    git(`checkout ${STAGING_BRANCH}`);
    git(`pull --ff-only origin ${STAGING_BRANCH}`);

    // Tag points at the sprint commit. revert it (create a new commit undoing the change).
    const revert = tryGit(`revert --no-edit ${tag}`);
    if (!revert.ok) {
      tryGit("revert --abort");
      return {
        ok: false,
        error: `revert conflict: ${revert.err.slice(0, 500)}`,
      };
    }
    const push = tryGit(`push origin ${STAGING_BRANCH}`);
    if (!push.ok) return { ok: false, error: `push failed: ${push.err}` };

    const sha = git("rev-parse HEAD");
    return { ok: true, sha, tag };
  } finally {
    releaseLock();
  }
}

function currentBranch() {
  return git("rev-parse --abbrev-ref HEAD");
}

module.exports = {
  approveSprint,
  revertSprint,
  currentBranch,
  STAGING_BRANCH,
  PROD_BRANCH,
};
