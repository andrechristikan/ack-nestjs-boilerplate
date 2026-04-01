# ACK NestJS — Key Scripts Reference

## Development

```bash
pnpm start:dev         # Dev server with hot reload
pnpm build             # Production build
pnpm format            # Format code with Prettier
pnpm lint              # Run ESLint
pnpm lint:fix          # Fix ESLint errors
```

## Database

```bash
pnpm db:migrate        # Sync Prisma schema to MongoDB
pnpm db:generate       # Regenerate Prisma client (run after schema changes)
pnpm db:studio         # Open Prisma Studio
```

## Migration & Seeding

```bash
pnpm migration:seed                        # Seed all data
pnpm migration:remove                      # Remove all seeded data
pnpm migration:fresh                       # Reset DB and re-seed
pnpm migration {module} --type seed        # Seed specific module
pnpm migration {module} --type remove      # Remove specific module
```

## Testing & Quality

```bash
pnpm test              # Run tests
pnpm deadcode          # Check for unused code
pnpm spell             # Spell check
pnpm typecheck         # TypeScript type checking
```

## Docker

```bash
docker-compose up -d   # Start MongoDB + Redis + JWKS server
docker-compose down    # Stop containers
```

> **Note:** `dockerfile` (root) is for **development only** (`start:dev`, includes devDependencies).
> Production uses a separate multi-stage Dockerfile: `node:lts-alpine`, `NODE_ENV=production`, `CMD ["node", "dist/main.js"]`, `USER node`.
> Never copy `.env` into Docker image — inject via environment variables at runtime.

## Keys & Utilities

```bash
pnpm generate:keys     # Generate JWT keys (ES256/ES512)
pnpm clean             # Clean build and dependencies
pnpm package:upgrade   # Upgrade packages
pnpm package:check     # Check package updates
```
