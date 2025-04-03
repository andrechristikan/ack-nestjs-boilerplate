# Overview

The database architecture in ACK NestJS Boilerplate follows a clean repository pattern that provides a clear separation between business logic and data access layers. The architecture is built on MongoDB using Mongoose as the Object Data Modeling (ODM) library, offering a robust, type-safe approach to database operations.

The database functionality is organized into several key components:

1. **Database Module** - Global module providing database services
2. **Repository Pattern** - Implementation for data access abstraction
3. **Entity Definitions** - MongoDB schema representations
4. **Repository Implementations** - Concrete data access implementations


## Table of Contents
- [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Modules](#modules)
    - [DatabaseOptionService](#databaseoptionservice)
    - [DatabaseService](#databaseservice)
  - [Repository](#repository)
    - [Base Repository Class](#base-repository-class)
    - [Entity Base Class](#entity-base-class)
  - [Structure](#structure)
  - [Example](#example)
    - [Entity](#entity)
    - [Repository](#repository-1)
    - [Repository Module Example](#repository-module-example)
    - [Service](#service)

## Modules

The database architecture uses two primary modules:

1. **DatabaseOptionModule**: Provides the configuration for MongoDB connections.
2. **DatabaseModule**: Global module that provides database services throughout the application.

```typescript
@Module({
    providers: [DatabaseOptionService],
    exports: [DatabaseOptionService],
    imports: [],
    controllers: [],
})
export class DatabaseOptionModule {}

@Global()
@Module({})
export class DatabaseModule {
    static forRoot(): DynamicModule {
        return {
            module: DatabaseModule,
            providers: [DatabaseService],
            exports: [DatabaseService],
            imports: [],
            controllers: [],
        };
    }
}
```

### DatabaseOptionService

The `DatabaseOptionService` configures MongoDB connection parameters, handling environment variables and connection optimization:

```typescript
@Injectable()
export class DatabaseOptionService implements IDatabaseOptionService {
    constructor(private readonly configService: ConfigService) {}

    createOptions(): MongooseModuleOptions {
        const env = this.configService.get<string>('app.env');
        const url = this.configService.get<string>('database.url');
        const debug = this.configService.get<boolean>('database.debug');
        const timeoutOptions = this.configService.get<Record<string, number>>('database.timeoutOptions');

        if (env !== ENUM_APP_ENVIRONMENT.PRODUCTION) {
            mongoose.set('debug', debug);
        }

        return {
            uri: url,
            autoCreate: env === ENUM_APP_ENVIRONMENT.MIGRATION,
            autoIndex: env === ENUM_APP_ENVIRONMENT.MIGRATION,
            ...timeoutOptions,
        };
    }
}
```

### DatabaseService

The `DatabaseService` provides core database functionality, including transaction management and query helpers:

```typescript
@Injectable()
export class DatabaseService implements IDatabaseService {
    constructor(
        @InjectDatabaseConnection()
        private readonly databaseConnection: Connection
    ) {}

    // Transaction support
    async createTransaction(): Promise<ClientSession> {
        const session: ClientSession = await this.databaseConnection.startSession();
        session.startTransaction();
        return session;
    }

    async commitTransaction(session: ClientSession): Promise<void> {
        await session.commitTransaction();
        await session.endSession();
    }

    async abortTransaction(session: ClientSession): Promise<void> {
        await session.abortTransaction();
        await session.endSession();
    }
    
    // Filter helpers
    filterEqual<T = string>(field: string, filterValue: T): Record<string, { $eq: T }> {
        return {
            [field]: {
                $eq: filterValue,
            },
        };
    }

    filterNotEqual<T = string>(field: string, filterValue: T): Record<string, { $ne: T }> {
        return {
            [field]: {
                $ne: filterValue,
            },
        };
    }

    filterContain(field: string, filterValue: string): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue);
    }

    filterContainFullMatch(field: string, filterValue: string): Record<string, any> {
        return DatabaseHelperQueryContain(field, filterValue, {
            fullWord: true,
        });
    }

    filterIn<T = string>(field: string, filterValue: T[]): Record<string, { $in: T[] }> {
        return {
            [field]: {
                $in: filterValue,
            },
        };
    }

    filterDateBetween(
        fieldStart: string,
        fieldEnd: string,
        filterStartValue: Date,
        filterEndValue: Date
    ): Record<string, any> {
        if (fieldStart === fieldEnd) {
            return {
                [fieldStart]: {
                    $gte: filterStartValue,
                    $lte: filterEndValue,
                },
            };
        }

        return {
            [fieldStart]: {
                $gte: filterStartValue,
            },
            [fieldEnd]: {
                $lte: filterEndValue,
            },
        };
    }
}
```

## Repository

The repository pattern implementation provides a consistent approach to database operations across all entities in the application.

### Base Repository Class

The `DatabaseRepositoryBase` class serves as the foundation for all repositories, providing a comprehensive set of common database operations:

```typescript
export class DatabaseRepositoryBase<
    Entity extends DatabaseEntityBase,
    EntityDocument extends IDatabaseDocument<Entity>,
> {
    protected readonly _repository: Model<Entity>;
    readonly _join?: PopulateOptions | (string | PopulateOptions)[];

    constructor(
        repository: Model<Entity>,
        options?: PopulateOptions | (string | PopulateOptions)[]
    ) {
        this._repository = repository;
        this._join = options;
    }

    // Find methods
    async findAll<T = EntityDocument>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> { /* ... */ }

    async findOne<T = EntityDocument>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> { /* ... */ }

    async findOneById<T = EntityDocument>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> { /* ... */ }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> { /* ... */ }

    async exists(
        find: Record<string, any>,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> { /* ... */ }

    // Create and update methods
    async create<T extends Entity>(
        data: T,
        options?: IDatabaseCreateOptions
    ): Promise<EntityDocument> { /* ... */ }

    async save(
        repository: EntityDocument,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> { /* ... */ }

    async update(
        find: Record<string, any>,
        data: UpdateQuery<Entity>,
        options?: IDatabaseUpdateOptions
    ): Promise<EntityDocument> { /* ... */ }

    async delete(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<EntityDocument> { /* ... */ }

    // Soft delete support
    async softDelete(
        repository: EntityDocument,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<EntityDocument> { /* ... */ }

    async restore(
        repository: EntityDocument,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> { /* ... */ }

    // Join method
    async join<T = any>(
        repository: EntityDocument,
        joins: PopulateOptions | (string | PopulateOptions)[]
    ): Promise<T> { /* ... */ }

    // Bulk operations
    async createMany<T extends Partial<Entity>>(
        data: T[],
        options?: IDatabaseCreateManyOptions
    ): Promise<InsertManyResult<Entity>> { /* ... */ }

    async updateMany<T = Entity>(
        find: Record<string, any>,
        data: T,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult<Entity>> { /* ... */ }

    async updateManyRaw(
        find: Record<string, any>,
        data: UpdateQuery<Entity>,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult<Entity>> { /* ... */ }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<DeleteResult> { /* ... */ }

    async softDeleteMany(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UpdateResult<Entity>> { /* ... */ }

    async restoreMany(
        find: Record<string, any>,
        options?: IDatabaseSaveOptions
    ): Promise<UpdateResult<Entity>> { /* ... */ }

    // Aggregate operations
    async aggregate<
        AggregatePipeline extends PipelineStage,
        AggregateResponse = any,
    >(
        pipelines: AggregatePipeline[],
        options?: IDatabaseAggregateOptions
    ): Promise<AggregateResponse[]> { /* ... */ }

    async findAllAggregate<
        AggregatePipeline extends PipelineStage,
        AggregateResponse = any,
    >(
        pipelines: AggregatePipeline[],
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<AggregateResponse[]> { /* ... */ }

    async getTotalAggregate<AggregatePipeline extends PipelineStage>(
        pipelines: AggregatePipeline[],
        options?: IDatabaseAggregateOptions
    ): Promise<number> { /* ... */ }

    // Model access
    async model(): Promise<Model<Entity>> { /* ... */ }
}
```

### Entity Base Class

All database entities inherit from the `DatabaseEntityBase` class, which provides common fields like ID, created/updated timestamps, and soft delete support:

```typescript
export class DatabaseEntityBase {
    @DatabaseProp({
        type: String,
        required: true,
        default: uuidV4,
    })
    _id: string;

    @DatabaseProp({
        required: true,
        index: true,
        default: false,
    })
    deleted: boolean;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
        default: Date.now,
    })
    createdAt: Date;

    @DatabaseProp({
        required: false,
        index: true,
    })
    createdBy?: string;

    @DatabaseProp({
        required: false,
        index: 'asc',
        type: Date,
    })
    updatedAt: Date;

    @DatabaseProp({
        required: false,
        index: true,
    })
    updatedBy?: string;

    @DatabaseProp({
        required: false,
        index: true,
        type: Date,
    })
    deletedAt?: Date;

    @DatabaseProp({
        required: false,
        index: true,
    })
    deletedBy?: string;
}
```

## Structure

Each module in the application follows a consistent repository structure:

```
/modules/{module-name}/
├── repository/
│   ├── entities/
│   │   └── {entity-name}.entity.ts    # Schema definition
│   ├── repositories/
│   │   └── {entity-name}.repository.ts # Repository implementation
│   └── {entity-name}.repository.module.ts # Repository module config
```

## Example

### Entity

An entity definition includes schema fields and validation through decorators:

```typescript
@DatabaseEntity({ collection: UserTableName })
export class UserEntity extends DatabaseEntityBase {
    @DatabaseProp({
        required: true,
        index: true,
        unique: true,
        type: String,
    })
    email: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    firstName: string;

    @DatabaseProp({
        required: true,
        type: String,
    })
    lastName: string;

    // More properties and relationships...
}

export const UserSchema = DatabaseSchema(UserEntity);
export type UserDoc = IDatabaseDocument<UserEntity>;
```

### Repository

Each repository extends the base repository and customizes functionality as needed:

```typescript
@Injectable()
export class UserRepository extends DatabaseRepositoryBase<
    UserEntity,
    UserDoc
> {
    constructor(
        @InjectDatabaseModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>
    ) {
        super(userModel, [
            {
                path: 'role',
                localField: 'role',
                foreignField: '_id',
                model: RoleEntity.name,
                justOne: true,
            },
            {
                path: 'country',
                localField: 'country',
                foreignField: '_id',
                model: CountryEntity.name,
                justOne: true,
            },
            {
                path: 'mobileNumber.country',
                localField: 'mobileNumber.country',
                foreignField: '_id',
                model: CountryEntity.name,
                justOne: true,
            },
        ]);
    }
}
```

### Repository Module Example

Each repository has its own module to handle dependencies and exports:

```typescript
@Module({
    providers: [UserRepository],
    exports: [UserRepository],
    controllers: [],
    imports: [
        MongooseModule.forFeature(
            [
                {
                    name: UserEntity.name,
                    schema: UserSchema,
                },
            ],
            DATABASE_CONNECTION_NAME
        ),
    ],
})
export class UserRepositoryModule {}
```

### Service

Services use repositories for data access, implementing business logic on top of the repository layer:

```typescript
@Injectable()
export class UserService implements IUserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {}

    async findAll<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> {
        return this.userRepository.findAll<T>(find, {
            ...options,
            join: true,
        });
    }

    async findOneById<T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        return this.userRepository.findOneById<T>(_id, {
            ...options,
            join: true,
        });
    }

    async create<Dto>(
        data: Dto,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const create: UserEntity = new UserEntity();
        
        // Map DTO data to entity fields
        Object.assign(create, data);
        
        return this.userRepository.create<UserEntity>(create, options);
    }

    async delete(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<UserDoc> {
        return this.userRepository.delete(find, options);
    }

    async updateOneById<Dto>(
        _id: string,
        data: Dto,
        options?: IDatabaseUpdateOptions
    ): Promise<UserDoc> {
        return this.userRepository.update({ _id }, { $set: data }, options);
    }

    async softDelete(
        repository: UserDoc,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UserDoc> {
        return this.userRepository.softDelete(repository, options);
    }

    // More service methods...
}
```