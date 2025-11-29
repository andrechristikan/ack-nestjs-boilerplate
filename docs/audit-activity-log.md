<!-- REFERENCES -->

<!-- BADGE LINKS -->

[ack-contributors-shield]: https://img.shields.io/github/contributors/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-forks-shield]: https://img.shields.io/github/forks/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-stars-shield]: https://img.shields.io/github/stars/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-issues-shield]: https://img.shields.io/github/issues/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[ack-license-shield]: https://img.shields.io/github/license/andrechristikan/ack-nestjs-boilerplate?style=for-the-badge
[nestjs-shield]: https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white
[nodejs-shield]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[typescript-shield]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[mongodb-shield]: https://img.shields.io/badge/MongoDB-white?style=for-the-badge&logo=mongodb&logoColor=4EA94B
[jwt-shield]: https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white
[jest-shield]: https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white
[yarn-shield]: https://img.shields.io/badge/yarn-%232C8EBB.svg?style=for-the-badge&logo=yarn&logoColor=white
[docker-shield]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[github-shield]: https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white

<!-- CONTACTS -->

[ref-author-linkedin]: https://linkedin.com/in/andrechristikan
[ref-author-email]: mailto:andrechristikan@gmail.com
[ref-author-github]: https://github.com/andrechristikan
[ref-author-paypal]: https://www.paypal.me/andrechristikan
[ref-author-kofi]: https://ko-fi.com/andrechristikan

<!-- Repo LINKS -->

[ref-ack]: https://github.com/andrechristikan/ack-nestjs-boilerplate
[ref-ack-issues]: https://github.com/andrechristikan/ack-nestjs-boilerplate/issues
[ref-ack-stars]: https://github.com/andrechristikan/ack-nestjs-boilerplate/stargazers
[ref-ack-forks]: https://github.com/andrechristikan/ack-nestjs-boilerplate/network/members
[ref-ack-contributors]: https://github.com/andrechristikan/ack-nestjs-boilerplate/graphs/contributors
[ref-ack-license]: LICENSE.md

<!-- THIRD PARTY -->

[ref-nestjs]: http://nestjs.com
[ref-prisma]: https://www.prisma.io
[ref-mongodb]: https://docs.mongodb.com/
[ref-redis]: https://redis.io
[ref-bullmq]: https://bullmq.io
[ref-nodejs]: https://nodejs.org/
[ref-typescript]: https://www.typescriptlang.org/
[ref-docker]: https://docs.docker.com
[ref-dockercompose]: https://docs.docker.com/compose/
[ref-yarn]: https://yarnpkg.com
[ref-12factor]: https://12factor.net
[ref-commander]: https://nest-commander.jaymcdoniel.dev
[ref-package-json]: package.json
[ref-jwt]: https://jwt.io
[ref-jest]: https://jestjs.io/docs/getting-started
[ref-git]: https://git-scm.com
[ref-google-console]: https://console.cloud.google.com/
[ref-google-client-secret]: https://developers.google.com/identity/protocols/oauth2

<!-- DOCUMENTS -->

[ref-doc-root]: readme.md
[ref-doc-audit-activity-log]: docs/audit-activity-log.md
[ref-doc-authentication]: docs/authentication.md
[ref-doc-authorization]: docs/authorization.md
[ref-doc-cache]: docs/cache.md
[ref-doc-configuration]: docs/configuration.md
[ref-doc-database]: docs/database.md
[ref-doc-environment]: docs/environment.md
[ref-doc-feature-flag]: docs/feature-flag.md
[ref-doc-how-to-handling-error]: docs/how-to-handling-error.md
[ref-doc-installation]: docs/installation.md
[ref-doc-internationalization]: docs/internationalization.md
[ref-doc-logger]: docs/logger.md
[ref-doc-project-structure]: docs/project-structure.md
[ref-doc-queue]: docs/queue.md
[ref-doc-request-validation]: docs/request-validation.md
[ref-doc-response-structure]: docs/response-structure.md
[ref-doc-security-and-middleware]: docs/security-and-middleware.md
[ref-doc-service-side-pagination]: docs/service-side-pagination.md
[ref-doc-third-party-integration]: docs/third-party-integration.md


<!-- # Overview

This document covers the audit functionality, including activity logging and password history tracking.

This documentation explains the features and usage of:
- **Activity Module**: Located at `src/modules/activity`
- **Password History Module**: Located at `src/modules/password-history`

# Table of Contents
- [Overview](#overview)
- [Table of Contents](#table-of-contents)
  - [Activity Module](#activity-module)
    - [Overview](#overview-1)
    - [How to Use](#how-to-use)
  - [Password History Module](#password-history-module)
    - [Overview](#overview-2)
    - [How to Use](#how-to-use-1)

## Activity Module

### Overview

The Activity module provides comprehensive user activity tracking throughout the application. It records actions performed by users with detailed information about what was done, when it occurred, and who initiated the action.

### How to Use

The Activity module is designed to be used across the application to track important user actions. There are two main methods for creating activities:

1. **User Activities**: Record actions initiated by the user themselves
   ```typescript
   this.activityService.createByUser(
     user,
     { description: 'Updated profile information' }
   );
   ```

2. **Admin Activities**: Record actions performed by admins on user accounts
   ```typescript
   this.activityService.createByAdmin(
     targetUser,
     { 
       by: adminUserId, 
       description: 'Reset user password' 
     }
   );
   ```


## Password History Module

### Overview

The Password History module tracks user password changes to enforce password policies such as preventing password reuse and monitoring password change frequency. This module is essential for maintaining security standards and compliance requirements.

Key features:
- Records password changes with timestamps
- Stores password hashes for comparison
- Differentiates between different types of password changes (`SIGN_UP`, `FORGOT`, `TEMPORARY`, `CHANGE`)
- Supports querying password history for policy enforcement
- Implements configurable password expiration periods

### How to Use

The Password History module provides two main methods for recording password changes:

1. **User Password History**: Record password changes initiated by the user themselves
   ```typescript
   passwordHistoryService.createByUser(
     user,
     { type: ENUM_PASSWORD_HISTORY_TYPE.CHANGE }
   );
   ```

2. **Admin Password History**: Record password changes performed by admins
   ```typescript
   passwordHistoryService.createByAdmin(
     user,
     { 
       by: adminId, 
       type: ENUM_PASSWORD_HISTORY_TYPE.TEMPORARY 
     }
   );
   ``` -->
