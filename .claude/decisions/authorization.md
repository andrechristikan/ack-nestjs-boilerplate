# Authorization decisions

## Roles and workspace ownership

### Policies belong to admin-type roles only

Rule: `role.md`.

- Policies on every role, kept for a future user route: a stored policy that restricts nothing misleads whoever reads the role.

### A platform admin transfers a stranded workspace; a block or deactivation is never refused for ownership

Rule: `transaction.md`, Queries.

- Refusing a block or deactivation while the user owns a workspace with members: an abusive account could not be stopped until its holder cooperated.

### A workspace has exactly one owner

Rule: `transaction.md`, Queries.

- Several owners, or a promotion to owner by a role update: one owner gives a transfer, a self-delete, and a block a single row to check.

### One guard per subject loads the subject and the caller's membership

Rule: `guards.md`, Decorator order.

- A subject guard and a member guard stacked: two reads a route, and no route mounts one without the other.

### `blocked` is final

Rule: `login.md`.

- An admin unblock, or any admin edit on a blocked account: `inactive` is the reversible state, and `blocked` stays the permanent ban for abuse.
