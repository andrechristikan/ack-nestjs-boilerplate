# Authorization decisions

## Roles and workspace ownership

### Policies belong to admin-type roles only

Rule: `role.md`.

- Policies on every role, kept for a future user route: a stored policy that restricts nothing misleads whoever reads the role.

### A platform admin transfers a stranded workspace; a block or deactivation is never refused for ownership

Rule: `transaction.md`, Queries.

- Refusing a block or deactivation while the user owns a workspace with members: an abusive account could not be stopped until its holder cooperated.
