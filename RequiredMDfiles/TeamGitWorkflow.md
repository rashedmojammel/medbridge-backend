# MedBridge — Team Git Workflow (4 Members)

Project: MedBridge Backend · NestJS + Next.js + PostgreSQL
Repo: https://github.com/rashedmojammel/medbridge-backend.git
Rule of thumb: **pull → branch → code → push → PR**. If you remember that, you know the whole workflow.

---

## 1. Team & Ownership

| Member   | Backend modules                             | Frontend areas                                     | Branch prefix                                               |
| -------- | ------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Member 1 | auth, users, config, seeds                  | public pages, login/register, admin users          | `feature/auth-*`, `feature/users-*`                         |
| Member 2 | patients, triage                            | CHW pages                                          | `feature/patients-*`, `feature/triage-*`                    |
| Member 3 | consultations (chat gateway), prescriptions | doctor pages, chat UI                              | `feature/consult-*`, `feature/rx-*`                         |
| Member 4 | medicines, appointments, notifications      | pharmacist pages, appointments, notification panel | `feature/medicines-*`, `feature/appt-*`, `feature/notify-*` |

> Update the module split above to match MedBridge's actual domains once you've settled on them — the rest of this doc doesn't depend on the exact names.

You mostly work inside YOUR folders. Shared files (`app.module.ts`, `package.json`, entities other people relate to) — announce in the group chat before touching.

---

## 2. One-Time Setup

### Repo owner (Rashed) does once:

```bash
# repo already created: medbridge-backend (add teammates as collaborators)
git clone https://github.com/rashedmojammel/medbridge-backend.git
cd medbridge-backend
# push scaffold: backend + frontend folders, .gitignore, .env.example, ARCHITECTURE.md
git add .
git commit -m "chore: initial project scaffold"
git push origin main

# create the shared integration branch
git checkout -b dev
git push origin dev
```

Then on GitHub → **Settings → Branches → Add branch protection rule**:

- Branch name pattern: `main` → ✔ Require a pull request before merging
- Repeat for `dev` → ✔ Require a pull request, ✔ Require 1 approval

### Everyone does once:

```bash
git clone https://github.com/rashedmojammel/medbridge-backend.git
cd medbridge-backend
git checkout dev
cp .env.example .env        # fill in your local DB password
npm install                 # in backend/ and frontend/
git config user.name "Your Name"
git config user.email "your-github-email"
```

`.gitignore` must contain (never commit these):

```
node_modules/
dist/
.next/
.env
uploads/*
```

---

## 3. Branch Model

```
main   ← demo-ready only. Merged from dev at milestones. Protected.
 └─ dev   ← integration. All finished features live here. Protected.
     ├─ feature/auth-login            (Member 1)
     ├─ feature/patients-register    (Member 2)
     ├─ feature/consult-chat-gateway (Member 3)
     └─ feature/medicines-inventory  (Member 4)
```

- **Never commit directly to `main` or `dev`.** Everything goes through a feature branch + Pull Request.
- One branch = one feature = one PR. Small beats big.
- Branch naming: `feature/<module>-<short-description>` · bug fixes: `fix/<module>-<what>`.

---

## 4. Daily Routine (every member, every work session)

```bash
# 1. Get everyone's latest work FIRST
git checkout dev
git pull origin dev

# 2. Create your feature branch
git checkout -b feature/triage-vitals-form

# 3. Work. Commit small and often.
git add .
git commit -m "feat(triage): add vitals recording endpoint"

# 4. Before pushing, sync with dev again (catch conflicts early, on YOUR machine)
git checkout dev && git pull origin dev
git checkout feature/triage-vitals-form
git merge dev            # fix any conflicts now, locally

# 5. Push your branch
git push origin feature/triage-vitals-form

# 6. Open a Pull Request on GitHub:  feature/triage-vitals-form → dev
#    Fill title + short description, request a reviewer.
```

After the PR is merged, delete the branch (GitHub offers a button) and start the loop again from step 1 for your next feature.

---

## 5. Commit Message Convention

Format: `type(module): short description` — present tense, lowercase.

| Type     | Use for                         | Example                                      |
| -------- | ------------------------------- | -------------------------------------------- |
| feat     | new feature                     | `feat(rx): add prescription create endpoint` |
| fix      | bug fix                         | `fix(auth): reject expired JWT`              |
| refactor | code change, no behavior change | `refactor(medicines): extract stock check`   |
| style    | formatting only                 | `style: run prettier on triage module`       |
| docs     | documentation                   | `docs: add API list to README`               |
| chore    | setup, deps, config             | `chore: add socket.io dependency`            |
| test     | tests                           | `test(patients): MRN format spec`            |

---

## 6. Pull Request Rules (team agreement)

1. Every PR targets `dev` (never `main` directly).
2. **1 approval required** before merge. Reviewer rotation: M1→M2→M3→M4→M1 (you review the next member's PRs). Rotating spreads knowledge of the whole codebase.
3. Reviewer checks: does it run? any hardcoded secrets? DTO validation present? guards on protected routes? no `console.log` leftovers? no files that belong in .gitignore?
4. Keep PRs under ~400 changed lines when possible. Giant PRs get rubber-stamped, not reviewed.
5. PR description template (paste into every PR):
   ```
   ## What
   - added vitals recording endpoint + DTO

   ## How to test
   - POST /triage/vitals with sample body (see Swagger)

   ## Notes
   - touches shared file? (yes/no — which)
   ```
6. The PR author merges after approval (choose **"Squash and merge"** — keeps dev history clean: one commit per feature).
7. If review requests changes: push new commits to the same branch — the PR updates automatically.

---

## 7. Merging dev → main (milestones)

Only at agreed checkpoints (end of week / before demo / before report deadline):

1. Whole team confirms `dev` runs: backend boots, seed works, frontend builds.
2. Rashed opens PR `dev → main`, title: `release: milestone 2 — patient + triage flow complete`.
3. Quick team review, merge.
4. Tag it: `git tag v0.2 && git push origin v0.2` — tags give you safe rollback points and look professional in the repo history.

---

## 8. Merge Conflicts — the calm procedure

A conflict just means two people edited the same lines. It is normal, not an emergency.

```bash
git merge dev
# CONFLICT in src/app.module.ts
```

Open the file — Git marks the disagreement:

```
<<<<<<< HEAD
    TriageModule,
=======
    MedicinesModule,
>>>>>>> dev
```

Fix by keeping what's correct (often BOTH):

```
    TriageModule,
    MedicinesModule,
```

Delete the `<<<<<<<`, `=======`, `>>>>>>>` markers, then:

```bash
git add .
git commit -m "merge: resolve app.module conflict"
git push
```

**Prevention beats cure:**

- Pull dev daily (step 1 of the routine). Old branches = painful conflicts.
- `app.module.ts` is the #1 conflict file (everyone registers modules there). When you add your module import, tell the chat.
- Never edit another member's module files without asking — comment on their PR instead.
- Entities used across modules (e.g. `Users`, `Patients`): the OWNER defines them; others import. If you need a new column on someone else's entity, request it — don't add it yourself.

---

## 9. Weekly Rhythm

| Day                     | Activity                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Sunday (or kickoff day) | 30-min sync: what shipped, what's next, any blockers, shared-file changes this week             |
| Daily                   | Pull dev before working. Push at least once per working day (nothing lives only on your laptop) |
| End of week             | All open PRs reviewed + merged; dev must run clean; milestone merge to main if planned          |

Use **GitHub Issues + Projects board** (To Do / In Progress / In Review / Done). One issue per wireframe screen or endpoint group, assigned to its owner, linked in the PR with `Closes #12`. This doubles as evidence of teamwork for your instructor.

---

## 10. Emergency Commands (when things go wrong)

| Situation                                | Command                                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Committed to dev by mistake (not pushed) | `git checkout -b feature/rescue` → your work is now on a branch; then `git checkout dev && git reset --hard origin/dev`                                                                    |
| Want to throw away local mess            | `git checkout -- .` (unstaged) or `git reset --hard origin/<branch>` (everything)                                                                                                          |
| Committed .env or node_modules           | `git rm -r --cached .env node_modules` → commit → verify .gitignore. If a real secret was pushed: CHANGE the secret (new JWT_SECRET / DB password) — deleting the file does not un-leak it |
| Need teammate's unmerged branch          | `git fetch origin && git checkout feature/their-branch`                                                                                                                                    |
| Merge went wrong mid-way                 | `git merge --abort` — back to before the merge                                                                                                                                             |
| "What just happened?"                    | `git log --oneline --graph --all`                                                                                                                                                          |

---

## 11. Hard Rules (print this part)

1. NEVER push directly to `main` or `dev`.
2. NEVER commit `.env`, `node_modules/`, `dist/`, `uploads/`.
3. Pull `dev` before you start working. Every time.
4. One feature → one branch → one PR → one review → merge.
5. Push your work at least daily — an unpushed laptop is a single point of failure.
6. Announce edits to shared files (`app.module.ts`, `package.json`, cross-module entities).
7. If stuck on Git for more than 15 minutes, ask the team BEFORE trying random commands.

---

## 12. Cheat Sheet

```bash
git checkout dev && git pull            # sync
git checkout -b feature/x-y             # new branch
git add . && git commit -m "feat: ..."  # save point
git merge dev                           # bring in latest (while on your branch)
git push origin feature/x-y             # upload → open PR on GitHub
git log --oneline --graph --all         # see the map
git merge --abort                       # undo a bad merge
```
