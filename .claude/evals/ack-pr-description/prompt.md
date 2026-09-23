---
name: ack-pr-description
tags: [ack-pr, description]
runs: 1
max_turns: 10
allowed_tools: [Read, Glob, Grep, Skill]
---

Write the pull request description for this branch against `main`. Fill the repository's
PR template so I can paste it into GitHub. Do not open the PR yet; give me the file path
and anything the diff did not settle.
