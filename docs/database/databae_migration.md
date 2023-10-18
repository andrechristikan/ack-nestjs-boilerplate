
# Database Migration

> The migration will do data seeding to MongoDB. Make sure to check the value of the `DATABASE_` prefix in your`.env` file.

The Database migration used [NestJs-Command][ref-nestjscommand]

For seeding

```bash
yarn seed
```

For remove all data do

```bash
yarn rollback
```

# API Key Test
api key: `2ihKDneb9jQGgidAOqfO`
api key secret: `ZLCtDd2rh3TAyVhfAeo3JOPvWfAsTp0Oq6rHl69D`

# User Test

1. Super Admin
   - email: `superadmin@mail.com`
   - password: `aaAA@@123444`
2. Admin
   - email: `admin@mail.com`
   - password: `aaAA@@123444`
3. Member
   - email: `member@mail.com`
   - password: `aaAA@@123444`
4. User
   - email: `user@mail.com`
   - password: `aaAA@@123444`

<!-- Reference -->
[ref-nestjs]: http://nestjs.com
[ref-mongoose]: https://mongoosejs.com
[ref-mongodb]: https://docs.mongodb.com/
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-nestjscommand]: https://gitlab.com/aa900031/nestjs-command
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
