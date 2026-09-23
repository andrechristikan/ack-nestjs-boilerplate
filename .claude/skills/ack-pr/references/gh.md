# gh pr command sequence

Every write runs in the session, after the fork has returned the document. Show the exact
command to the owner first and run it only on a yes. Merge is not in this list:
`gh pr merge` stays under `ask` in `.claude/settings.json` and this skill does not propose
it.

## Preconditions

```bash
gh auth status
git push -u origin <branch>        # under ask; only when the branch is not on origin yet
```

## Mode `create`

```bash
gh pr create --base <base> --head <branch> --title "<title>" --body-file generated/docs/pr-<slug>.md
```

Draft when the owner says so: add `--draft`. The title is the branch's conventional subject
or the one the owner gave. Report the URL `gh` prints.

## Update an existing description

```bash
gh pr edit <number> --body-file generated/docs/pr-<slug>.md
```

## Mode `comment`

A top-level comment:

```bash
gh pr comment <number> --body-file generated/docs/pr-comment-<slug>.md
```

A reply inside a review thread (the thread's first comment id is `<comment-id>`):

```bash
gh api --method POST repos/{owner}/{repo}/pulls/<number>/comments/<comment-id>/replies \
  --field body=@generated/docs/pr-comment-<slug>.md
```

A review verdict on the owner's behalf is not written here; the owner submits reviews.

## After a write

```bash
gh pr view <number> --json url,title,state,isDraft
```

Quote the URL and the state in the hand-back. Leave `ack-pr/*` local refs in place; the
owner deletes them.
