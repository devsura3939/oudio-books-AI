/**
 * Mirror this Lovable project to github.com/devsura3939/oudio-books-AI.
 *
 * Why a script instead of `git push`: the Lovable sandbox manages git state, so
 * changes are shipped through the GitHub Git Data API (blobs → tree → commit →
 * ref). The commit uses the current `main` tree as its base, so nothing that is
 * already in the repo is ever deleted — files are only added or updated.
 *
 * What it ships:
 *   • repo root `index.html` + `static/*`  ← `public/studio/**`
 *     (this is what GitHub Pages serves, per .github/workflows/pages.yml)
 *   • `lovable-app/**`                     ← the TanStack Start app source
 *   • `PROJECT.md`, `CHANGELOG.md`         ← docs for the next agent
 *
 * Usage:  bun scripts/push-to-github.mjs "commit message"
 * Needs:  GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN (or GITHUB_TOKEN) with
 *         contents:write on the repo.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const REPO = "devsura3939/oudio-books-AI";
const BRANCH = "main";
const TOKEN =
  process.env.GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
const MESSAGE = process.argv[2] || "Sync from Lovable";

if (!TOKEN) throw new Error("No GitHub token in the environment.");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".output",
  ".nitro",
  ".vinxi",
  ".tanstack",
  ".lovable",
  ".vite",
  "coverage",
]);
const SKIP_FILES = new Set([".env", ".env.local", "bun.lockb"]);

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...(await walk(path.join(dir, entry.name), base)));
    } else if (entry.isFile() && !SKIP_FILES.has(entry.name)) {
      out.push(path.relative(base, path.join(dir, entry.name)));
    }
  }
  return out;
}

async function api(endpoint, { method = "GET", body } = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub ${method} ${endpoint} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

/** Build the list of { repoPath, localPath } pairs to ship. */
async function manifest() {
  const files = [];

  // 1. The static studio → repo root (what GitHub Pages publishes).
  for (const rel of await walk("public/studio")) {
    files.push({ repoPath: rel.split(path.sep).join("/"), localPath: path.join("public/studio", rel) });
  }

  // 2. The Lovable app source → lovable-app/.
  const appDirs = ["src", "supabase", "public"];
  for (const dir of appDirs) {
    for (const rel of await walk(dir)) {
      const posix = rel.split(path.sep).join("/");
      if (dir === "public" && posix.startsWith("studio/")) continue; // already at root
      files.push({ repoPath: `lovable-app/${dir}/${posix}`, localPath: path.join(dir, rel) });
    }
  }
  const appRootFiles = [
    "package.json",
    "bun.lock",
    "bunfig.toml",
    "components.json",
    "eslint.config.js",
    "tsconfig.json",
    "vite.config.ts",
    ".prettierrc",
    ".prettierignore",
    "AGENTS.md",
    "README.md",
    "scripts/push-to-github.mjs",
  ];
  for (const rel of appRootFiles) {
    try {
      await stat(rel);
      files.push({ repoPath: `lovable-app/${rel}`, localPath: rel });
    } catch {
      /* optional file */
    }
  }

  // 3. Handbook + changelog at the repo root so the next agent reads them first,
  //    plus the Google Stitch design reference screens.
  for (const doc of [
    "PROJECT.md",
    "CHANGELOG.md",
    "docs/design/stitch-screens.html.txt",
  ]) {
    try {
      await stat(doc);
      files.push({ repoPath: doc, localPath: doc });
    } catch {
      /* optional file */
    }
  }
  return files;
}

const files = await manifest();
const head = await api(`/git/ref/heads/${BRANCH}`);
const baseCommit = await api(`/git/commits/${head.object.sha}`);

// Blobs are created individually so binary files (covers, mp3s) survive intact.
const tree = [];
for (const file of files) {
  const content = await readFile(file.localPath);
  const blob = await api("/git/blobs", {
    method: "POST",
    body: { content: content.toString("base64"), encoding: "base64" },
  });
  tree.push({ path: file.repoPath, mode: "100644", type: "blob", sha: blob.sha });
}

const newTree = await api("/git/trees", {
  method: "POST",
  body: { base_tree: baseCommit.tree.sha, tree },
});
const commit = await api("/git/commits", {
  method: "POST",
  body: { message: MESSAGE, tree: newTree.sha, parents: [head.object.sha] },
});
await api(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: { sha: commit.sha } });

console.log(`Pushed ${files.length} files → ${REPO}@${BRANCH} (${commit.sha.slice(0, 7)})`);
console.log("GitHub Pages redeploys automatically from .github/workflows/pages.yml");
