# Overview

> In the future will replace `nestjs-command` with `commander`

This document covers the migration and seed functionality in the ACK NestJS Boilerplate project, explaining how database seeding works and how to use the migration commands.

The migration system in ACK NestJS Boilerplate provides a way to populate the database with initial data, ensuring consistent and repeatable database setups. The system uses `nestjs-command` to create CLI commands that can be executed to seed or remove data from the database.

Each seed module is responsible for a specific domain area and can be executed independently or as part of the full migration process. Seeds can also be reversed, allowing you to clean up the database as needed.


## Table of Contents
- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Modules](#modules)
    - [Migration Module](#migration-module)
    - [Seed Modules](#seed-modules)
  - [Data Seed](#data-seed)
    - [API Key Seed](#api-key-seed)
    - [Country Seed](#country-seed)
    - [Role Seed](#role-seed)
    - [User Seed](#user-seed)
  - [Template Seed](#template-seed)
    - [Purpose](#purpose)
    - [Supported Templates](#supported-templates)
    - [Implementation](#implementation)
    - [Commands](#commands)
    - [Usage](#usage)
  - [Running Migrations](#running-migrations)
  - [Structure](#structure)
  - [Creating Custom Seeds](#creating-custom-seeds)


## Modules 

### Migration Module

The Migration Module (`src/migration/migration.module.ts`) serves as the entry point for all migration operations. It imports all necessary modules and registers seed providers:

```typescript
@Module({
    imports: [
        CommonModule,
        CommandModule,
        ApiKeyModule,
        CountryModule,
        EmailModule,
        AuthModule,
        RoleModule,
        UserModule,
        ActivityModule,
        PasswordHistoryModule,
        SessionModule,
        CountryModule,
    ],
    providers: [
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationUserSeed,
        MigrationRoleSeed,
        MigrationTemplateSeed,
    ],
    exports: [],
})
export class MigrationModule {}
```

This module integrates with the `CommandModule` from `nestjs-command` to provide command-line functionality and imports all required service modules to perform the seeding operations.

### Seed Modules

Seed modules are responsible for populating the database with initial data. Each seed module focuses on a specific domain area and follows a consistent pattern:

1. An `@Injectable()` class that accepts relevant services via dependency injection
2. Methods decorated with `@Command()` that execute seeding operations
3. Typically includes both a `seeds()` method to add data and a `remove()` method to clean up data

All seed modules are registered in the `MigrationModule` as providers, allowing them to be executed via the command line.

The seed process follows a logical progression where dependent data is seeded first. The typical order is:
1. API Keys
2. Countries
3. Roles
4. Users
5. Templates (handled separately)

## Data Seed

### API Key Seed

**File**: `src/migration/seeds/migration.api-key.seed.ts`

Seeds the database with default API keys for different types of access:

- Default API Key: Used for general access
- System API Key: Used for system-level operations or service-to-service

Commands:
- `seed:apikey` - Creates API keys
- `remove:apikey` - Removes all API keys

### Country Seed

**File**: `src/migration/seeds/migration.country.seed.ts`

Seeds the database with country information. By default, it adds Indonesia with all its related data.

Commands:
- `seed:country` - Adds countries
- `remove:country` - Removes all countries

### Role Seed

**File**: `src/migration/seeds/migration.role.seed.ts`

Seeds the database with predefined roles and their permissions:

- `superadmin` - Has all system permissions
- `admin` - Has administrative permissions
- `individual` - Standard user role
- `premium` - Premium user role
- `business` - Business user role

Commands:
- `seed:role` - Creates roles
- `remove:role` - Removes all roles

### User Seed

**File**: `src/migration/seeds/migration.user.seed.ts`

Seeds the database with default users for each role type. It also creates corresponding password history and activity records for each user.

Commands:
- `seed:user` - Creates users
- `remove:user` - Removes all users, activities, password histories, and sessions

Default seeded users include:
- `superadmin@mail.com`
- `admin@mail.com`
- `individual@mail.com`
- `premium@mail.com`
- `business@mail.com`

All with the default password: `aaAA@123`

## Template Seed

**File**: `src/migration/seeds/migration.template.seed.ts`

Unlike other seed modules that populate database records, the Template Seed module is responsible for importing and registering email templates used by the application's notification system. These templates are injected into AWS Simple Email Service (SES) for email delivery.

### Purpose
Email templates are essential for consistent communication with users across various application events such as registration, password resets, and account verifications. Using AWS SES templates allows for standardized and scalable email communications with proper formatting and branding.

### Supported Templates
The Template Seed imports templates for:

- Welcome emails
- Account creation notifications
- Password change notifications
- Temporary password issuance
- Reset password instructions
- Email verification
- Email verification confirmation
- Mobile number verification
- Mobile verification confirmation

Each template is stored as an HTML file in the `/src/templates/` directory and processed by the EmailService which registers them with AWS SES.

### Implementation
The MigrationTemplateSeed uses the EmailService to import templates:

```typescript
try {
    await this.emailService.importWelcome();
} catch (err: any) {
    throw new Error(err);
}
```

Behind the scenes, the EmailService reads the template file and uses the AWS SES service to create or update the template in your AWS account.

### Commands
- `migrate:template` - Imports all email templates to AWS SES
- `rollback:template` - Removes all email templates from AWS SES

### Usage
Templates are processed separately from database seeds and can be managed independently:

```bash
# Import all templates to AWS SES
npm run migrate:template

# Remove all templates from AWS SES
npm run rollback:template
```

## Running Migrations

The project includes npm scripts to simplify migration operations:

```bash
# Run all migrations
npm run migrate

# Run migrations in reverse (clean up the database)
npm run migrate:remove

# Only migrate template data
npm run migrate:template

# Remove template data
npm run rollback:template

# Complete reset and rebuild of the database
npm run migrate:fresh
```

These commands are defined in the `package.json` file:

```json
"scripts": {
    "migrate": "APP_ENV=migration nestjs-command seed:apikey && nestjs-command seed:country && nestjs-command seed:role && nestjs-command seed:user",
    "migrate:remove": "APP_ENV=migration nestjs-command remove:user && nestjs-command remove:country && nestjs-command remove:apikey  && nestjs-command remove:role",
    "migrate:template": "APP_ENV=migration nestjs-command migrate:template",
    "rollback:template": "APP_ENV=migration nestjs-command rollback:template",
    "migrate:fresh": "APP_ENV=migration nestjs-command remove:user && nestjs-command remove:country && nestjs-command remove:apikey && nestjs-command remove:role && nestjs-command seed:apikey && nestjs-command seed:country && nestjs-command seed:role && nestjs-command seed:user"
}
```

## Structure

Each seed class follows a similar structure:

1. Injectable decorator and constructor with service dependencies
2. Command decorator with command name and description
3. Seeds method for adding data
4. Remove method for cleaning up data

Example structure:

```typescript
@Injectable()
export class MigrationCountrySeed {
    constructor(private readonly countryService: CountryService) {}

    @Command({
        command: 'seed:country',
        describe: 'seeds countries',
    })
    async seeds(): Promise<void> {
        // Implementation for adding data
    }

    @Command({
        command: 'remove:country',
        describe: 'remove countries',
    })
    async remove(): Promise<void> {
        // Implementation for removing data
    }
}
```

## Creating Custom Seeds

To create a custom seed module:

1. Create a new file in `src/migration/seeds/`
2. Implement the seed class with `@Injectable()` decorator
3. Inject required services in the constructor
4. Add `@Command()` methods for seed and remove operations
5. Register your seed class in `src/migration/migration.module.ts`

Example of a custom seed:

```typescript
import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { YourService } from 'src/modules/your-module/services/your.service';

@Injectable()
export class MigrationYourSeed {
    constructor(private readonly yourService: YourService) {}

    @Command({
        command: 'seed:your-command',
        describe: 'seeds your data',
    })
    async seeds(): Promise<void> {
        try {
            const data = [
                // Your data here
            ];
            
            await this.yourService.createMany(data);
        } catch (err: any) {
            throw new Error(err.message);
        }
        
        return;
    }

    @Command({
        command: 'remove:your-command',
        describe: 'remove your data',
    })
    async remove(): Promise<void> {
        try {
            await this.yourService.deleteMany({});
        } catch (err: any) {
            throw new Error(err.message);
        }
        
        return;
    }
}
```

Then add your new seed to the `MigrationModule`:

```typescript
@Module({
    // ...imports
    providers: [
        // ...existing seeds
        MigrationYourSeed,
    ],
})
export class MigrationModule {}
```

Finally, update the npm scripts in `package.json` to include your new commands.
