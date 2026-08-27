---
description: Security-scan, push, and publish this repo to GitHub (README, About/tags, Pages via Action)
argument-hint: "[github-repo-url]"
---

You are running the **github-publish** workflow for this repository. Follow these
steps in order. Do not skip the security scan, and do not push anything until it
passes.

## Context
- Repo argument (optional): $ARGUMENTS — if given and no `origin` remote exists yet,
  use it to set one up. If `origin` already exists, prefer it and just confirm it
  matches (mention it to the user if it differs from the argument, don't silently
  override).
- This project has no build step: plain `index.html` / `styles.css` / `script.js`.

## Step 1 — Security scan (blocking)
Before touching git, scan the full working tree (not just the diff) for anything
that should never leave this machine:
- Hardcoded API keys, tokens, secrets (`AKIA`, `sk-`, `ghp_`, `gho_`, private key
  blocks, `Authorization:` headers with real values, etc.)
- `.env` files or credentials files not covered by `.gitignore`
- Real personal data that doesn't belong in placeholder copy (real phone numbers,
  real home addresses, real emails that aren't intentionally the contact info for
  this business)
- Any `FORM_ENDPOINT` or config value that looks like a live internal system URL
  rather than a placeholder

If you find anything, **stop and report it** — do not proceed to push. Ask the user
whether to redact/remove it or confirm it's intentional (e.g. a real business email
for a real enquiry form) before continuing.

If clean, say so explicitly and continue.

## Step 2 — Commit & push
- `git status` to see what's changed.
- If there are uncommitted changes, stage and commit them with a clear message
  describing what changed (not a generic "update" message).
- Push to `origin` on the current default branch.

## Step 3 — README
Create or update `README.md` at the repo root with:
- A title and one-paragraph **About** section describing the project.
- **Tech badges** (shields.io) for HTML5, CSS3, and JavaScript (vanilla, no
  frameworks) — reflect what's actually used, don't invent a tech stack.
- **How to install / run locally** — since there's no build step, this is just
  "clone, then open `index.html`" or "serve with any static file server" (mention
  why: the enquiry form uses `fetch()`, which needs `http://` not `file://`).
- **Credits** — built with Claude Code as part of the WSQ Agentic AI Applications
  with Claude Code course.
- If GitHub Pages is live (see Step 5), a link to the live site near the top.

## Step 4 — GitHub About + tags
Using `gh repo edit`, set:
- `--description` to a one-line summary matching the README's About section.
- `--add-topic` for relevant topics (e.g. `html-css-javascript`, `static-site`,
  `vanilla-js`, `it-services-website`, `no-framework`).

## Step 5 — GitHub Pages via Action
Check the repo's visibility first (`gh repo view --json visibility`).
- **If private**: GitHub Pages requires a paid plan for private repos on personal
  accounts. Skip enabling Pages, tell the user clearly why, and note that this step
  will complete automatically once the repo is made public — don't fail the whole
  command over this.
- **If public**: create `.github/workflows/deploy-pages.yml` using
  `actions/upload-pages-artifact` + `actions/deploy-pages` (upload the repo root as
  the artifact — no build step needed), enable Pages with
  `gh api -X POST repos/{owner}/{repo}/pages -f build_type=workflow` if not already
  enabled, push the workflow file, and wait for the resulting Actions run to
  complete. Report the live Pages URL.

## Step 6 — Wire the Pages link back in
Once you have a live Pages URL (this run or a prior one):
- Add/update it in the README (top of file).
- Set it as the repo's homepage: `gh repo edit --homepage "<url>"`.
- Commit and push this final update.

## Step 7 — Report
Summarize plainly: what was scanned, what was pushed, the README/About changes,
and either the live Pages URL or why it's deferred.
