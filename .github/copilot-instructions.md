# GitHub Copilot Instructions for ACK NestJS Boilerplate

This document provides instructions for GitHub Copilot to generate code that follows the patterns, conventions, and architecture of this project.

## Project Overview

ACK NestJS Boilerplate (v8.0.0+) is a comprehensive authentication and authorization service built with NestJS v11.x. It uses:
- **Prisma ORM** for database operations (MongoDB with replication set)
- **PNPM** as the package manager
- **Repository Design Pattern** for data access layer
- **Modular Architecture** with clear separation of concerns
- **SOLID Principles** throughout the codebase
- **Redis** for caching and session management
- **BullMQ** for queue processing
- **ES256/ES512** JWT algorithms for authentication
- **TypeScript** with strict path aliases

## Architecture Patterns

### Module Structure

Every feature module follows this structure:
```
module/
├── bases/              # Abstract base classes for shared functionality
├── constants/          # Static values and configuration
├── controllers/        # API endpoint handlers
├── decorators/         # Custom metadata decorators
├── docs/              # Swagger/OpenAPI documentation decorators
├── dtos/              # Data Transfer Objects with validation
├── entities/          # Database entity types
├── enums/             # Type-safe enumerations
├── exceptions/        # Custom error classes
├── factories/         # Object creation patterns
├── filters/           # Exception/validation filters
├── guards/            # Authorization and access control
├── interceptors/      # Request/response transformation
├── interfaces/        # TypeScript contracts
├── middlewares/       # Request preprocessing
├── pipes/             # Data transformation and validation
├── processors/        # Background job handlers (BullMQ)
├── repositories/      # Data access layer (Prisma)
├── services/          # Business logic
├── templates/         # Email/document templates
├── utils/             # Helper utilities
└── validations/       # Custom validators
```

### Repository Pattern with Prisma

Always use repository pattern for database operations. The `DatabaseService` extends `PrismaClient`, so inject it directly without `@Inject`:

```typescript
// Repository Interface
export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    create(data: CreateUserDto): Promise<User>;
    // ... other methods
}

// Repository Implementation
@Injectable()
export class UserRepository implements IUserRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findById(id: string): Promise<User | null> {
        return this.databaseService.user.findFirst({
            where: { id }
        });
    }
}

// Service using Repository
export class UserService {
    constructor(
        private readonly userRepository: IUserRepository
    ) {}
}
```

### Path Aliases

Always use TypeScript path aliases defined in `tsconfig.json`:
- `@app/*` → `src/app/*`
- `@common/*` → `src/common/*`
- `@config` → `src/configs/index.ts`
- `@configs/*` → `src/configs/*`
- `@modules/*` → `src/modules/*`
- `@routes/*` → `src/router/routes/*`
- `@router` → `src/router/router.module.ts`
- `@migration/*` → `src/migration/*`

Example:
```typescript
import { DatabaseModule } from '@common/database/database.module';
import { IConfigAuth } from '@configs/auth.config';
import { UserModule } from '@modules/user/user.module';
```

## Authentication & Authorization

### Decorator Order

When using multiple protection decorators, apply them in this **EXACT** order (top to bottom):

```typescript
@ExampleDoc()                              // Documentation (always first)
@PolicyAbilityProtected({...})            // CASL policy-based permissions
@RoleProtected(...)                       // Role-based access control
@TermPolicyAcceptanceProtected(...)       // Terms acceptance verification
@ActivityLog(...)                         // Activity logging
@UserProtected()                          // User authentication check
@AuthJwtAccessProtected()                 // JWT access token validation
@FeatureFlagProtected(...)                // Feature flag check
@ApiKeyProtected()                        // API key authentication
@Get('/endpoint')                         // HTTP method (always last)
async method() { }
```

### JWT Authentication

- Access Token uses **ES256** algorithm
- Refresh Token uses **ES512** algorithm
- Sessions are stored in Redis (validation) and Database (management)
- JWT ID (jti) is validated on every request for session tracking

### Session Management

Sessions use dual storage:
- **Redis**: Primary validation, automatic expiration, high performance
- **Database**: Session listing, management, audit trail

Always invalidate sessions when:
- Password is changed
- Password is reset
- User logs out
- Session is revoked manually

## Request & Response

### DTOs (Data Transfer Objects)

Use `class-validator` decorators for validation:

```typescript
import { IsString, IsEmail, MinLength } from 'class-validator';
import { Expose } from 'class-transformer';

export class CreateUserDto {
    @IsEmail()
    @Expose()
    email: string;

    @IsString()
    @MinLength(8)
    @Expose()
    password: string;
}
```

### Response Decorators

Use standardized response decorators:

```typescript
// Standard response
@Response('user.get')
@Get('/:id')
async getUser(@Param('id') id: string): Promise<IResponseReturn<UserDto>> {
    return {
        data: await this.userService.findById(id)
    };
}

// Paginated response
@ResponsePaging('user.list')
@Get('/')
async listUsers(@Query() query: UserListDto): Promise<IResponsePagingReturn<UserDto[]>> {
    return await this.userService.list(query);
}
```

### Error Handling

Throw exceptions with proper message paths:

```typescript
if (!user) {
    throw new NotFoundException({
        statusCode: EnumUserStatusCodeError.notFound,
        message: 'user.error.notFound'
    });
}
```

## Database Operations

### Prisma Migrations

MongoDB doesn't support migrations with Prisma. Use `prisma db push`:

```bash
pnpm db:migrate     # Syncs schema to database
pnpm db:generate    # Generates Prisma client
pnpm db:studio      # Opens Prisma Studio
```

### Seeding

Create seeds in `src/migration/seeds/`:

```bash
pnpm migration {module} --type seed    # Add data
pnpm migration {module} --type remove  # Remove data
```

Available modules: `apiKey`, `country`, `featureFlag`, `role`, `termPolicy`, `user`

### Transactions

MongoDB requires **replica set** for transactions. Prisma supports two transaction types:

**1. Array Syntax** - For simple sequential operations:
```typescript
await this.databaseService.$transaction([
    this.databaseService.user.create({ data: userData }),
    this.databaseService.profile.create({ data: profileData })
]);
```

**2. Callback Syntax** - For complex logic with conditional operations:
```typescript
await this.databaseService.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });
    
    if (user.role === 'admin') {
        await tx.profile.create({ data: { ...profileData, userId: user.id } });
    }
    
    return user;
});
```

## Queue System (BullMQ)

### Creating Jobs

Inject queue and add jobs:

```typescript
export class EmailService {
    constructor(
        @InjectQueue(EnumQueue.email) 
        private readonly emailQueue: Queue
    ) {}

    async sendWelcomeEmail(userId: string): Promise<void> {
        await this.emailQueue.add(
            EnumSendEmailProcess.welcome,
            { userId },
            {
                priority: EnumQueuePriority.high,
                attempts: 3,
            }
        );
    }
}
```

### Creating Processors

Extend `QueueProcessorBase`:

```typescript
@QueueProcessor(EnumQueue.email)
export class EmailProcessor extends QueueProcessorBase {
    @Process(EnumSendEmailProcess.welcome)
    async processWelcome(job: Job<EmailWorkerDto>): Promise<void> {
        try {
            const { userId } = job.data;
            // Process job
            await this.sendEmail(userId);
        } catch (error) {
            throw new QueueException(
                'Email send failed',
                error,
                job.data
            );
        }
    }
}
```

## Logging

Always use `Logger` from `@nestjs/common` with class context:

```typescript
import { Logger } from '@nestjs/common';

export class UserService {
    private readonly logger = new Logger(UserService.name);

    async createUser(data: CreateUserDto): Promise<User> {
        this.logger.log('Creating new user');
        
        try {
            const user = await this.userRepository.create(data);
            this.logger.log(`User created: ${user.id}`);
            return user;
        } catch (error) {
            this.logger.error(`Failed to create user: ${error.message}`, error.stack);
            throw error;
        }
    }
}
```

Sensitive data is automatically redacted (password, token, apiKey, etc.).

## Caching

Use Redis for caching with decorators:

```typescript
@Response('user.get', { cache: true })
@Get('/:id')
async getUser(@Param('id') id: string): Promise<IResponseReturn<UserDto>> {
    return {
        data: await this.userService.findById(id)
    };
}
```

## Environment Configuration

Configuration files are in `src/configs/` and use environment variables:

```typescript
export default registerAs(
    'auth',
    (): IConfigAuth => ({
        password: {
            attempt: true,
            maxAttempt: 5,
            // ...
        },
        accessToken: {
            secretKey: process.env.AUTH_JWT_ACCESS_TOKEN_SECRET_KEY,
            expirationTime: '15m',
            // ...
        }
    })
);
```

## Internationalization (i18n)

Message files are in `src/languages/en/`. Keys support **nested JSON** structure, and the file name acts as the prefix:

```typescript
// src/languages/en/user.json
{
    "get": "Get user successfully",
    "error": {
        "notFound": "User not found",
        "alreadyExists": "User already exists"
    }
}

// Usage in code - prefix comes from filename
@Response('user.get')  // Resolves to user.json -> "get" key

throw new NotFoundException({
    message: 'user.error.notFound'  // Resolves to user.json -> error.notFound
});
```

**Important**: Don't use direct keys like `'user.get'` assuming it's a flat structure. The `user` prefix references the JSON file, and the rest navigates the nested object.

## Testing

Follow test file naming conventions:
- Unit tests: `*.spec.ts`
- Integration tests: `*.integration-spec.ts`
- E2E tests: `*.e2e-spec.ts`

```bash
pnpm test              # Run all tests
pnpm lint              # Run linter
pnpm format            # Format code
```

## Code Style

### Naming Conventions

- **Classes**: PascalCase (`UserService`, `CreateUserDto`)
- **Interfaces**: PascalCase with `I` prefix (`IUserRepository`, `IConfigAuth`)
- **Enums**: PascalCase with `Enum` prefix (`EnumUserStatus`, `EnumQueue`)
- **Constants**: PascalCase (`MaxAttempt`, `DefaultPageSize`)
- **Files**: kebab-case (`user.service.ts`, `auth.config.ts`)
- **Methods/Variables**: camelCase (`findById`, `userId`)
- **Enum Keys/Values**: camelCase (`active`, `inactive`, `deleted`)

### Enum Usage

Define enums in dedicated files using **PascalCase** for enum names and **camelCase** for keys/values:

```typescript
// enums/user-status.enum.ts
export enum EnumUserStatus {
    active = 'active',
    inactive = 'inactive',
    deleted = 'deleted'
}

// enums/user-status-code.enum.ts
export enum EnumUserStatusCodeError {
    notFound = 5000,
    alreadyExists = 5001,
    inactive = 5002
}
```

### Import Order

Organize imports in this order:
1. External packages (NestJS, third-party)
2. Project imports using **absolute path aliases only** (never use relative paths)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';

import { DatabaseModule } from '@common/database/database.module';
import { IConfigAuth } from '@config';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserDto } from '@modules/user/dtos/user.dto';
import { IUserService } from '@modules/user/interfaces/user-service.interface';
```

**Important**: Always use absolute imports with path aliases. Never use relative imports like `./` or `../`.

## Best Practices

1. **Always use interfaces** for dependency injection contracts
2. **Inject repositories**, not Prisma directly in services
3. **Use enums** for constants and status codes
4. **Validate DTOs** with class-validator decorators
5. **Handle errors** with custom exceptions and proper status codes
6. **Log operations** with context and proper log levels
7. **Use decorators** for cross-cutting concerns (auth, logging, caching)
8. **Follow module structure** - keep related code together
9. **Write type-safe code** - avoid `any` types
10. **Document APIs** with Swagger decorators
11. **Use transactions** for multi-step database operations
12. **Cache frequently accessed data** in Redis
13. **Process heavy tasks** in background queues
14. **Invalidate sessions** on security-sensitive operations
15. **Test your code** - write unit, integration, and e2e tests

## Important Notes

- **Production Mode**: Documentation is disabled when `APP_ENV=production`
- **MongoDB**: Must run as replica set for transactions
- **Prisma Client**: Regenerate after schema changes with `pnpm db:generate`
- **Sessions**: Dual storage (Redis + Database) for performance and management
- **JWT Algorithms**: ES256 for access tokens, ES512 for refresh tokens (since v8.0.0)
- **Package Manager**: Use PNPM only (enforced by preinstall script)

## Scripts Reference

```bash
# Development
pnpm start:dev         # Start development server
pnpm build             # Build project
pnpm format            # Format code with Prettier
pnpm lint              # Run ESLint
pnpm lint:fix          # Fix ESLint errors

# Database
pnpm db:migrate        # Sync Prisma schema to DB
pnpm db:generate       # Generate Prisma client
pnpm db:studio         # Open Prisma Studio

# Migration & Seeding
pnpm migration:seed    # Seed all data
pnpm migration:remove  # Remove all seeded data
pnpm migration {module} --type seed    # Seed specific module
pnpm migration {module} --type remove  # Remove specific module

# Testing
pnpm test              # Run tests
pnpm deadcode          # Check for unused code
pnpm spell             # Spell check
pnpm typecheck         # TypeScript type checking

# Docker
docker-compose up -d   # Start MongoDB + Redis
docker-compose down    # Stop containers

# Keys
pnpm generate:keys     # Generate JWT keys (ES256/ES512)

# Utilities
pnpm clean             # Clean build and dependencies
pnpm package:upgrade   # Upgrade packages
pnpm package:check     # Check package updates
```

## Design Patterns & Principles

### ✅ Patterns to Follow

1. **DRY (Don't Repeat Yourself)**
   - Single Redis connection shared across all services
   - Single configuration source in `src/configs/`
   - Reusable base classes (e.g., `QueueProcessorBase`)
   - Global modules for shared functionality

2. **Repository Pattern**
   - Always abstract database operations through repositories
   - Never inject `DatabaseService` directly into services
   - Use interfaces for dependency inversion
   - Keep business logic in services, data access in repositories

3. **Global Module Pattern**
   - Mark shared modules with `@Global()` decorator
   - Avoid repeated imports in feature modules
   - Examples: `CacheMainModule`, `RedisCacheModule`, `MessageModule`

4. **Decorator-Based Protection**
   - Stack decorators in correct order (see [Decorator Order](#decorator-order))
   - Use declarative approach for cross-cutting concerns
   - Combine guards through decorators, not in code

5. **Singleton Pattern for Resources**
   - One Redis connection for cache AND session
   - Centralized configuration loading
   - Shared utilities and helpers

6. **Dual Storage Strategy**
   - Redis for performance-critical operations (validation, caching)
   - Database for persistence and management (audit trail, listings)
   - Example: Session management uses both Redis and Database

7. **Nested JSON for i18n**
   - Message keys support nested structure
   - File name as prefix: `user.json` → `user.*` keys
   - Navigate nested objects: `user.error.notFound`

8. **Type-Safe Enums**
   - PascalCase with `Enum` prefix: `EnumUserStatus`
   - camelCase for keys/values: `active`, `inactive`
   - Dedicated files per enum

9. **Metadata Pattern**
   - Use `metadataActivityLog` in service responses
   - Decorators automatically capture and log metadata
   - Store context for audit trail

10. **Feature Flag Pattern**
    - Dynamic feature control without deployment
    - Gradual rollout with percentage-based access
    - Metadata for granular control within features

### ❌ Anti-Patterns to Avoid

1. **Direct Database Access**
   ```typescript
   // ❌ WRONG - Never inject DatabaseService in services
   export class UserService {
       constructor(private readonly databaseService: DatabaseService) {}
   }
   
   // ✅ CORRECT - Use repository pattern
   export class UserService {
       constructor(private readonly userRepository: IUserRepository) {}
   }
   ```

2. **Relative Imports**
   ```typescript
   // ❌ WRONG - Never use relative paths
   import { UserDto } from './dtos/user.dto';
   import { IUserService } from '../interfaces/user-service.interface';
   
   // ✅ CORRECT - Always use absolute path aliases
   import { UserDto } from '@modules/user/dtos/user.dto';
   import { IUserService } from '@modules/user/interfaces/user-service.interface';
   ```

3. **Multiple Redis Connections**
   ```typescript
   // ❌ WRONG - Creating separate connections
   const cacheRedis = new Redis();
   const sessionRedis = new Redis();
   
   // ✅ CORRECT - Share one connection via RedisClientCachedProvider
   ```

4. **Ignoring Decorator Order**
   ```typescript
   // ❌ WRONG - Incorrect order
   @Get('/endpoint')
   @AuthJwtAccessProtected()
   @UserProtected()
   @ExampleDoc()
   
   // ✅ CORRECT - Follow the exact order
   @ExampleDoc()
   @UserProtected()
   @AuthJwtAccessProtected()
   @Get('/endpoint')
   ```

5. **Flat i18n Structure**
   ```typescript
   // ❌ WRONG - Assuming flat structure
   {
       "user.get": "Get user",
       "user.error.notFound": "Not found"
   }
   
   // ✅ CORRECT - Use nested structure
   {
       "get": "Get user",
       "error": {
           "notFound": "Not found"
       }
   }
   ```

6. **Missing @Inject for Repositories**
   ```typescript
   // ❌ WRONG - Using @Inject unnecessarily
   constructor(@Inject(...) private readonly userRepository: IUserRepository) {}
   
   // ✅ CORRECT - Direct injection
   constructor(private readonly userRepository: IUserRepository) {}
   ```

7. **UPPER_SNAKE_CASE for Enums**
   ```typescript
   // ❌ WRONG - UPPER_SNAKE_CASE
   export enum ENUM_USER_STATUS {
       ACTIVE = 'ACTIVE',
       INACTIVE = 'INACTIVE'
   }
   
   // ✅ CORRECT - PascalCase name, camelCase keys
   export enum EnumUserStatus {
       active = 'active',
       inactive = 'inactive'
   }
   ```

8. **Logging Sensitive Data**
   ```typescript
   // ❌ WRONG - Logging sensitive information
   this.logger.log(`User logged in with password: ${password}`);
   
   // ✅ CORRECT - Sensitive fields are auto-redacted
   this.logger.log(`User logged in: ${userId}`);
   ```

9. **Missing Session Invalidation**
   ```typescript
   // ❌ WRONG - Not invalidating sessions on security changes
   async changePassword(userId: string, newPassword: string) {
       await this.userRepository.updatePassword(userId, newPassword);
       // Missing session invalidation!
   }
   
   // ✅ CORRECT - Always invalidate sessions
   async changePassword(userId: string, newPassword: string) {
       await this.userRepository.updatePassword(userId, newPassword);
       await this.sessionService.deleteAllByUserId(userId); // Invalidate all sessions
   }
   ```

10. **Using Array Transaction for Complex Logic**
    ```typescript
    // ❌ WRONG - Array syntax can't handle conditionals
    await this.databaseService.$transaction([
        this.databaseService.user.create({ data }),
        // Can't add conditional operations here
    ]);
    
    // ✅ CORRECT - Use callback for complex logic
    await this.databaseService.$transaction(async (tx) => {
        const user = await tx.user.create({ data });
        if (user.role === 'admin') {
            await tx.profile.create({ data: profileData });
        }
    });
    ```

## Additional Resources

Refer to these documentation files in `/docs`:
- `project-structure.md` - Detailed project architecture
- `authentication.md` - Authentication and session management
- `authorization.md` - Authorization and access control
- `database.md` - Database setup and operations
- `request-validation.md` - Request validation patterns
- `response.md` - Response formatting
- `handling-error.md` - Error handling
- `logger.md` - Logging system
- `queue.md` - Queue processing
- `cache.md` - Caching strategies
- `configuration.md` - Configuration management
- `environment.md` - Environment variables
- `file-upload.md` - File upload handling
- `pagination.md` - Pagination patterns
- `message.md` - Internationalization
- `activity-log.md` - Activity logging
- `term-policy.md` - Terms and policies
- `feature-flag.md` - Feature flags
- `security-and-middleware.md` - Security features
- `third-party-integration.md` - External integrations

---

**Remember**: This project emphasizes clean code, separation of concerns, and enterprise-grade patterns. Always follow the established architecture and conventions when generating new code.
