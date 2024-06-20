
# Database Migration

> The migration will do data seeding to MongoDB. Make sure to check the value of the `DATABASE_` prefix in your`.env` file.

The Database migration used [NestJs-Command][ref-nestjscommand]

For migrate the schema

```bash
yarn migrate
```

For seeding

```bash
yarn seed
```

For remove all data do

```bash
yarn rollback
```

# API Key Test
api key: `v8VB0yY887lMpTA2VJMV`
api key secret: `zeZbtGTugBTn3Qd5UXtSZBwt7gn3bg`

# User Test

1. Super Admin
   - email: `superadmin@mail.com`
   - password: `aaAA@123`
2. Admin
   - email: `admin@mail.com`
   - password: `aaAA@123`
3. Member
   - email: `member@mail.com`
   - password: `aaAA@123`
4. User
   - email: `user@mail.com`
   - password: `aaAA@123`

<!-- Reference -->
[ref-nestjscommand]: https://gitlab.com/aa900031/nestjs-command
