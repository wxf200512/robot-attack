# Toybot Breakout development and Git synchronization

Follow the repository-root AGENTS.md for game integration constraints.

## User-authorized workflow (2026-11-05)

The user explicitly requests a GitHub connection and branch synchronization after each development round. This overrides the root default of not committing or pushing unless asked.

- After each round with relevant file changes, review the diff and run checks appropriate to those changes, then commit and push to the agreed development branch.
- The current development branch is `game/toybot-breakout`. Keep work off the default branch unless the user explicitly requests otherwise.
- Confirmed synchronization destination: remote `github`, URL `https://github.com/wxf200512/robot-attack.git`. Push `game/toybot-breakout` here; retain the GitLab `origin` unchanged.
- Repository-local commit identity: `wxf200512 <1759646732@qq.com>` (GitHub owner from the supplied URL; email supplied by the user).
- Stage only changes for this game under `src/games/toybot-breakout/` and `public/games/toybot-breakout/`, plus any other changes explicitly authorized by the user. Review the staged diff before committing; do not use blanket `git add .`.
- Use meaningful commit messages describing the completed change. Do not create empty commits for advice-only rounds or repeatedly commit while edits are incomplete.
- Preserve the existing GitLab `origin`. The requested GitHub destination must be confirmed by the user before adding a GitHub remote or transmitting project contents. Do not assume that the existing GitLab remote is the requested GitHub destination.
- Use the user's confirmed Git author identity. Do not infer it from other repository authors or invent an email address.
- Never force-push, rewrite existing commits, merge into the default branch, or publish secrets as part of this workflow.
- If authentication, destination, identity, checks, or remote divergence prevents synchronization, preserve local work and report the exact uncompleted step. Do not claim a push succeeded without verifying it.
- After synchronization, report the branch, short commit hash, and push result.

## Generated layout previews

`victory-review.html` and `defeat-review.html` are generated, read-only QA fixtures. Keep the renderer source but exclude these generated HTML outputs from commits. Keep original game artwork and optimized runtime artwork available for reproducible builds.
