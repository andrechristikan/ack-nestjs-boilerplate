# Scaffold New Module

Follow this checklist to create a new module in ACK NestJS Boilerplate.

Replace `{module}` with the module name in **kebab-case** (e.g., `product`, `order-item`).
Replace `{Module}` with **PascalCase** (e.g., `Product`, `OrderItem`).

---

## 1. Folder Structure

Create only the folders you need — not all are required for every module:

```
src/modules/{module}/
├── constants/          # e.g., {module}.constant.ts
├── controllers/        # {module}.admin.controller.ts, {module}.user.controller.ts
├── decorators/         # Custom metadata decorators (if needed)
├── docs/               # Swagger doc decorators: {module}.admin.doc.ts
├── dtos/
│   ├── {module}.dto.ts                          # Request DTOs
│   └── response/{module}.response.dto.ts        # Response DTOs
├── enums/              # {module}.enum.ts
├── exceptions/         # {module}.exception.ts (if needed)
├── guards/             # (if needed)
├── interfaces/
│   ├── {module}.interface.ts                    # Domain data interface
│   └── {module}.service.interface.ts            # IService interface
├── repositories/       # {module}.repository.ts
├── services/           # {module}.service.ts
└── {module}.module.ts
```

---

## 2. Module File

```typescript
// src/modules/{module}/{module}.module.ts
import { Module } from '@nestjs/common';
import { {Module}Repository } from '@modules/{module}/repositories/{module}.repository';
import { {Module}Service } from '@modules/{module}/services/{module}.service';

@Module({
    providers: [{Module}Repository, {Module}Service],
    exports: [{Module}Service],
})
export class {Module}Module {}
```

---

## 3. Repository

```typescript
// src/modules/{module}/repositories/{module}.repository.ts
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@common/database/services/database.service';

@Injectable()
export class {Module}Repository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findById(id: string): Promise<{Module} | null> {
        return this.databaseService.{module}.findFirst({
            where: { id },
        });
    }

    async findAll(): Promise<{Module}[]> {
        return this.databaseService.{module}.findMany();
    }

    async create(data: Prisma.{Module}CreateInput): Promise<{Module}> {
        return this.databaseService.{module}.create({ data });
    }
}
```

> - Injects `DatabaseService` directly — no `@Inject`, no interface
> - Filter params use `Type | null`, normalize `null → {}` before Prisma

---

## 4. Service Interface

```typescript
// src/modules/{module}/interfaces/{module}.service.interface.ts
import { I{Module} } from '@modules/{module}/interfaces/{module}.interface';

export interface I{Module}Service {
    findById(id: string): Promise<I{Module} | null>;
    // add methods here
}
```

---

## 5. Service

```typescript
// src/modules/{module}/services/{module}.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { {Module}Repository } from '@modules/{module}/repositories/{module}.repository';
import { I{Module}Service } from '@modules/{module}/interfaces/{module}.service.interface';
import { I{Module} } from '@modules/{module}/interfaces/{module}.interface';
import { Enum{Module}StatusCodeError } from '@modules/{module}/enums/{module}.enum';

@Injectable()
export class {Module}Service implements I{Module}Service {
    constructor(private readonly {module}Repository: {Module}Repository) {}

    async findById(id: string): Promise<I{Module} | null> {
        const result = await this.{module}Repository.findById(id);
        if (!result) {
            throw new NotFoundException({
                statusCode: Enum{Module}StatusCodeError.notFound,
                message: '{module}.error.notFound',
            });
        }
        return result;
    }
}
```

> - Always implements the `I{Module}Service` interface
> - Never injects `DatabaseService` — only the repository

---

## 6. DTOs

```typescript
// src/modules/{module}/dtos/{module}.dto.ts  (Request DTO)
import { IsString, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class Create{Module}RequestDto {
    @IsString()
    @Expose()
    name: string;

    @IsOptional()
    @IsString()
    @Expose()
    description?: string;
}
```

```typescript
// src/modules/{module}/dtos/response/{module}.response.dto.ts  (Response DTO)
import { Expose } from 'class-transformer';

export class {Module}ResponseDto {
    @Expose()
    id: string;

    @Expose()
    name: string;

    @Expose()
    description: string | null;

    @Expose()
    createdAt: Date;
}
```

---

## 7. Controller

```typescript
// src/modules/{module}/controllers/{module}.admin.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { Response } from '@common/response/decorators/response.decorator';
import { {Module}Service } from '@modules/{module}/services/{module}.service';
import { Create{Module}RequestDto } from '@modules/{module}/dtos/{module}.dto';
import { {Module}ResponseDto } from '@modules/{module}/dtos/response/{module}.response.dto';
import { IResponseReturn } from '@common/response/interfaces/response.interface';

@Controller({
    version: '1',
    path: '/admin/{module}',
})
export class {Module}AdminController {
    constructor(private readonly {module}Service: {Module}Service) {}

    @Response('{module}.get')
    @Get('/:id')
    async get(@Param('id') id: string): Promise<IResponseReturn<{Module}ResponseDto>> {
        return { data: await this.{module}Service.findById(id) };
    }
}
```

> Decorator order (EXACT — never change):
> ```typescript
> @ExampleDoc()                          // 1. Swagger doc
> @TermPolicyAcceptanceProtected(...)    // 2. Term policy
> @PolicyAbilityProtected({...})         // 3. CASL policy
> @RoleProtected(...)                    // 4. Role check
> @ActivityLog(...)                      // 5. Activity log
> @UserProtected()                       // 6. User status check
> @AuthJwtAccessProtected()              // 7. JWT validation
> @FeatureFlagProtected(...)             // 8. Feature flag
> @ApiKeyProtected()                     // 9. API key
> @HttpCode(HttpStatus.OK)               // 10. HTTP status (only when needed)
> @Get('/endpoint')                      // 11. HTTP method (always last)
> ```

---

## 8. Enums

```typescript
// src/modules/{module}/enums/{module}.enum.ts
export enum Enum{Module}Status {
    active = 'active',
    inactive = 'inactive',
    deleted = 'deleted',
}

export enum Enum{Module}StatusCodeError {
    notFound = 9000,   // pick a unique range for this module
    alreadyExists = 9001,
}
```

---

## 9. i18n Messages

Create `src/languages/en/{module}.json`:

```json
{
  "get": "Get {module} successfully",
  "list": "List {module} successfully",
  "create": "Create {module} successfully",
  "update": "Update {module} successfully",
  "delete": "Delete {module} successfully",
  "error": {
    "notFound": "{Module} not found",
    "alreadyExists": "{Module} already exists"
  }
}
```

---

## 10. Register in App

Add `{Module}Module` to the appropriate router file in `src/router/routes/`.

---

## Checklist

- [ ] Folder structure created
- [ ] `{module}.module.ts` — providers + exports defined
- [ ] `{module}.repository.ts` — extends nothing, injects DatabaseService directly
- [ ] `{module}.service.interface.ts` — all public methods declared
- [ ] `{module}.service.ts` — implements interface, injects repository only
- [ ] Request DTO — suffix `RequestDto`, uses `class-validator`
- [ ] Response DTO — suffix `ResponseDto`, uses `@Expose()`
- [ ] Controller — correct decorator order, uses `@Response()` decorator
- [ ] Enums — `Enum` prefix, camelCase keys, unique status code range
- [ ] i18n JSON — nested structure, filename = key prefix
- [ ] Module registered in router
