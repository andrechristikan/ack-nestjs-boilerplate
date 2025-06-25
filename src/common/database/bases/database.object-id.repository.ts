import {
    Document,
    Model,
    PipelineStage,
    PopulateOptions,
    RootFilterQuery,
    Types,
    UpdateQuery,
} from 'mongoose';
import {
    IDatabaseAggregateOptions,
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseDeleteOptions,
    IDatabaseDocument,
    IDatabaseExistsOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateManyOptions,
    IDatabaseUpdateOptions,
    IDatabaseUpsertOptions,
} from '@common/database/interfaces/database.interface';
import { DeleteResult, InsertManyResult, UpdateResult } from 'mongodb';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { DatabaseObjectIdEntityBase } from '@common/database/bases/database.object-id.entity';

export class DatabaseObjectIdRepositoryBase<
    Entity extends DatabaseObjectIdEntityBase,
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

    // Helper method to convert string to ObjectId if needed
    protected toObjectId(id: string | Types.ObjectId): Types.ObjectId {
        return typeof id === 'string' ? new Types.ObjectId(id) : id;
    }

    // Find
    async findAll<T = EntityDocument>(
        find?: RootFilterQuery<Entity>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> {
        const repository = this._repository.find<T>({
            ...find,
            ...(!options?.withDeleted && {
                deleted: false,
            }),
        });

        if (options?.select) {
            repository.select(options.select);
        }

        if (options?.paging) {
            repository.limit(options.paging.limit).skip(options.paging.offset);
        }

        if (options?.order) {
            repository.sort(options.order);
        }

        if (options?.join) {
            repository.populate(
                (typeof options.join === 'boolean' && options.join
                    ? this._join
                    : options.join) as
                    | PopulateOptions
                    | (string | PopulateOptions)[]
            );
        }

        if (options?.session) {
            repository.session(options.session);
        }

        return repository.exec();
    }

    async findOne<T = EntityDocument>(
        find: RootFilterQuery<Entity>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        const repository = this._repository.findOne<T>({
            ...find,
            ...(!options?.withDeleted && {
                deleted: false,
            }),
        });

        if (options?.select) {
            repository.select(options.select);
        }

        if (options?.join) {
            repository.populate(
                (typeof options.join === 'boolean' && options.join
                    ? this._join
                    : options.join) as
                    | PopulateOptions
                    | (string | PopulateOptions)[]
            );
        }

        if (options?.order) {
            repository.sort(options.order);
        }

        if (options?.session) {
            repository.session(options.session);
        }

        return repository.exec();
    }

    async findOneById<T = EntityDocument>(
        _id: string | Types.ObjectId,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        if (!_id) {
            throw new Error('ID must be provided');
        }

        const objectId = this.toObjectId(_id);

        const repository = this._repository.findOne<T>({
            _id: objectId,
            ...(!options?.withDeleted && {
                deleted: false,
            }),
        } as any);

        if (options?.select) {
            repository.select(options.select);
        }

        if (options?.join) {
            repository.populate(
                (typeof options.join === 'boolean' && options.join
                    ? this._join
                    : options.join) as
                    | PopulateOptions
                    | (string | PopulateOptions)[]
            );
        }

        if (options?.order) {
            repository.sort(options.order);
        }

        if (options?.session) {
            repository.session(options.session);
        }

        return repository.exec();
    }

    async findOneAndLock<T = EntityDocument>(
        find: RootFilterQuery<Entity>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        const repository = this._repository.findOneAndUpdate<T>(
            {
                ...find,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            {
                $set: {
                    updatedAt: new Date(),
                },
            },
            {
                new: true,
                upsert: false,
                timestamps: true,
            }
        );

        if (options?.select) {
            repository.select(options.select);
        }

        if (options?.join) {
            repository.populate(
                (typeof options.join === 'boolean' && options.join
                    ? this._join
                    : options.join) as
                    | PopulateOptions
                    | (string | PopulateOptions)[]
            );
        }

        if (options?.order) {
            repository.sort(options.order);
        }

        if (options?.session) {
            repository.session(options.session);
        }

        return repository.exec();
    }

    async findOneByIdAndLock<T = EntityDocument>(
        _id: string | Types.ObjectId,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        if (!_id) {
            throw new Error('ID must be provided');
        }

        const objectId = this.toObjectId(_id);

        const repository = this._repository.findOneAndUpdate<T>(
            {
                _id: objectId,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            } as any,
            {
                $set: {
                    updatedAt: new Date(),
                },
            },
            {
                new: true,
                upsert: false,
                timestamps: true,
            }
        );

        if (options?.select) {
            repository.select(options.select);
        }

        if (options?.join) {
            repository.populate(
                (typeof options.join === 'boolean' && options.join
                    ? this._join
                    : options.join) as
                    | PopulateOptions
                    | (string | PopulateOptions)[]
            );
        }

        if (options?.order) {
            repository.sort(options.order);
        }

        if (options?.session) {
            repository.session(options.session);
        }

        return repository.exec();
    }

    async getTotal(
        find?: RootFilterQuery<Entity>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        const repository = this._repository.countDocuments({
            ...find,
            ...(!options?.withDeleted && {
                deleted: false,
            }),
        });

        if (options?.join) {
            repository.populate(
                (typeof options.join === 'boolean' && options.join
                    ? this._join
                    : options.join) as
                    | PopulateOptions
                    | (string | PopulateOptions)[]
            );
        }

        if (options?.session) {
            repository.session(options.session);
        }

        return repository;
    }

    async exists(
        find: RootFilterQuery<Entity>,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        const repository = this._repository.exists({
            ...find,
            ...(!options?.withDeleted && {
                deleted: false,
            }),
        });

        if (options?.join) {
            repository.populate(
                (typeof options.join === 'boolean' && options.join
                    ? this._join
                    : options.join) as
                    | PopulateOptions
                    | (string | PopulateOptions)[]
            );
        }

        if (options?.session) {
            repository.session(options.session);
        }

        if (options?.excludeId) {
            repository
                .where('_id')
                .ne(
                    typeof options.excludeId === 'string'
                        ? new Types.ObjectId(options.excludeId)
                        : options.excludeId
                );
        }

        const result = await repository;
        return result ? true : false;
    }

    async create<T extends Entity>(
        data: T,
        options?: IDatabaseCreateOptions
    ): Promise<EntityDocument> {
        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Data must be a non-empty object');
        }

        const now = new Date();
        data.createdAt = now;
        data.updatedAt = now;

        if (options?.actionBy) {
            data.createdBy =
                typeof options.actionBy === 'string'
                    ? (new Types.ObjectId(options.actionBy) as any)
                    : (options.actionBy as any);
        }

        const created = await this._repository.create([data], options);

        return created[0] as EntityDocument;
    }

    // Action
    async update<T extends Entity>(
        find: RootFilterQuery<Entity>,
        data: T,
        options?: IDatabaseUpdateOptions
    ): Promise<EntityDocument> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Data must be a non-empty object');
        }

        const now = new Date();
        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;

        const finalData = {
            $set: {
                ...data,
                updatedAt: now,
                ...(actionBy && { updatedBy: actionBy }),
            },
        };

        return this._repository.findOneAndUpdate(
            {
                ...find,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            finalData,
            {
                ...options,
                new: true,
            }
        );
    }

    async updateRaw(
        find: RootFilterQuery<Entity>,
        data: UpdateQuery<Entity>,
        options?: IDatabaseUpdateOptions
    ): Promise<EntityDocument> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        if (Array.isArray(data)) {
            // Validate data structure
            const hasInvalidOperation = data.some(
                operation =>
                    !operation ||
                    typeof operation !== 'object' ||
                    Object.keys(operation).length === 0
            );

            if (hasInvalidOperation) {
                throw new Error('Data contains invalid operations');
            }
        } else if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Data must be a non-empty object');
        }

        const now = new Date();
        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;

        // Handle array data update
        if (Array.isArray(data)) {
            const setIndexOf = data.findLastIndex(e => e['$set']);
            if (setIndexOf > -1) {
                data[setIndexOf]['$set'].updatedAt = now;
                if (actionBy) {
                    data[setIndexOf]['$set'].updatedBy = actionBy;
                }
            } else {
                data.push({
                    $set: {
                        updatedAt: now,
                        ...(actionBy && { updatedBy: actionBy }),
                    },
                });
            }
        } else {
            // Handle single object update
            data['$set'] = {
                ...data['$set'],
                updatedAt: now,
                ...(actionBy && { updatedBy: actionBy }),
            };
        }

        return this._repository.findOneAndUpdate(
            {
                ...find,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            data,
            {
                ...options,
                new: true,
            }
        );
    }

    async upsert(
        find: RootFilterQuery<Entity>,
        data: UpdateQuery<Entity>,
        options?: IDatabaseUpsertOptions
    ): Promise<EntityDocument> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Data must be a non-empty object');
        }

        const now = new Date();
        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;

        data['$set'] = {
            ...data['$set'],
            updatedAt: now,
            ...(actionBy && { updatedBy: actionBy }),
        };

        // For new documents
        if (!data['$setOnInsert']) {
            data['$setOnInsert'] = {
                createdAt: now,
                ...(actionBy && { createdBy: actionBy }),
            };
        } else {
            data['$setOnInsert'] = {
                ...data['$setOnInsert'],
                createdAt: now,
                ...(actionBy && { createdBy: actionBy }),
            };
        }

        return this._repository.findOneAndUpdate(
            {
                ...find,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            data,
            {
                ...options,
                new: true,
                upsert: true,
                timestamps: true,
            }
        );
    }

    async delete(
        find: RootFilterQuery<Entity>,
        options?: IDatabaseDeleteOptions
    ): Promise<EntityDocument> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        return (await this._repository.findOneAndDelete(
            {
                ...find,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            {
                ...options,
                new: false,
            }
        )) as unknown as EntityDocument;
    }

    async save(
        repository: EntityDocument,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        if (!repository || !(repository instanceof Document)) {
            throw new Error('Repository must be a valid document');
        }

        if (repository.isNew) {
            const now = new Date();
            repository.createdAt = now;
            repository.updatedAt = now;
            if (options?.actionBy) {
                repository.createdBy =
                    typeof options.actionBy === 'string'
                        ? (new Types.ObjectId(options.actionBy) as any)
                        : (options.actionBy as any);
            }
        } else {
            repository.updatedAt = new Date();
            if (options?.actionBy) {
                repository.updatedBy =
                    typeof options.actionBy === 'string'
                        ? (new Types.ObjectId(options.actionBy) as any)
                        : (options.actionBy as any);
            }
        }

        return repository.save(options);
    }

    async join<T>(
        repository: EntityDocument,
        joins: PopulateOptions | (string | PopulateOptions)[]
    ): Promise<T> {
        if (!repository || !(repository instanceof Document)) {
            throw new Error('Repository must be a valid document');
        }

        if (!joins || (Array.isArray(joins) && joins.length === 0)) {
            throw new Error('Joins must be valid population options');
        }

        return repository.populate<T>(joins);
    }

    // Soft delete
    async softDelete(
        repository: EntityDocument,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<EntityDocument> {
        if (!repository || !(repository instanceof Document)) {
            throw new Error('Repository must be a valid document');
        }

        repository.deletedAt = new Date();
        repository.deleted = true;
        if (options?.actionBy) {
            repository.deletedBy =
                typeof options.actionBy === 'string'
                    ? (new Types.ObjectId(options.actionBy) as any)
                    : (options.actionBy as any);
        }

        return repository.save(options);
    }

    async restore(
        repository: EntityDocument,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        if (!repository || !(repository instanceof Document)) {
            throw new Error('Repository must be a valid document');
        }

        repository.deletedAt = undefined;
        repository.deletedBy = undefined;
        repository.deleted = false;
        repository.updatedAt = new Date();
        if (options?.actionBy) {
            repository.updatedBy =
                typeof options.actionBy === 'string'
                    ? (new Types.ObjectId(options.actionBy) as any)
                    : (options.actionBy as any);
        }

        return repository.save(options);
    }

    // Bulk
    async createMany<T extends Partial<Entity>>(
        data: T[],
        options?: IDatabaseCreateManyOptions
    ): Promise<InsertManyResult<Entity>> {
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Data must be a non-empty array');
        }

        // Validate data structure
        const hasInvalidItem = data.some(
            item =>
                !item ||
                typeof item !== 'object' ||
                Object.keys(item).length === 0
        );

        if (hasInvalidItem) {
            throw new Error('Data contains invalid items');
        }

        const now = new Date();
        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;

        return this._repository.insertMany(
            data.map(e => {
                return {
                    ...e,
                    createdAt: now,
                    updatedAt: now,
                    ...(actionBy && { createdBy: actionBy }),
                } as unknown as Entity;
            }),
            {
                ...options,
                rawResult: true,
            }
        );
    }

    async updateMany<T = Entity>(
        find: RootFilterQuery<Entity>,
        data: T,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult<Entity>> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Data must be a non-empty object');
        }

        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;

        return this._repository.updateMany(
            {
                ...find,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            {
                $set: {
                    ...data,
                    updatedAt: new Date(),
                    ...(actionBy && { updatedBy: actionBy }),
                },
            },
            { ...options, rawResult: true }
        );
    }

    async updateManyRaw(
        find: RootFilterQuery<Entity>,
        data: UpdateQuery<Entity>,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult<Entity>> {
        if (
            !find ||
            typeof find !== 'object' ||
            Object.keys(find).length === 0
        ) {
            throw new Error('Find criteria must be a non-empty object');
        }

        if (Array.isArray(data)) {
            // Validate data structure
            const hasInvalidOperation = data.some(
                operation =>
                    !operation ||
                    typeof operation !== 'object' ||
                    Object.keys(operation).length === 0
            );

            if (hasInvalidOperation) {
                throw new Error('Data contains invalid operations');
            }
        } else if (
            !data ||
            typeof data !== 'object' ||
            Object.keys(data).length === 0
        ) {
            throw new Error('Data must be a non-empty object');
        }

        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;
        const now = new Date();

        // Handle array data update
        if (Array.isArray(data)) {
            const setIndexOf = data.findLastIndex(e => e['$set']);
            if (setIndexOf > -1) {
                data[setIndexOf]['$set'].updatedAt = now;
                if (actionBy) {
                    data[setIndexOf]['$set'].updatedBy = actionBy;
                }
            } else {
                data.push({
                    $set: {
                        updatedAt: now,
                        ...(actionBy && { updatedBy: actionBy }),
                    },
                });
            }
        } else {
            // Handle single object update
            data['$set'] = {
                ...data['$set'],
                updatedAt: now,
                ...(actionBy && { updatedBy: actionBy }),
            };
        }

        return this._repository.updateMany(
            {
                ...find,
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            data,
            {
                ...options,
                rawResult: true,
            }
        );
    }

    async deleteMany(
        find?: RootFilterQuery<Entity>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<DeleteResult> {
        // Allow find to be optional, but if provided it must be a valid object
        if (
            find !== undefined &&
            (typeof find !== 'object' || Object.keys(find).length === 0)
        ) {
            throw new Error(
                'If provided, find criteria must be a non-empty object'
            );
        }

        return this._repository.deleteMany(
            {
                ...(find || {}),
                ...(!options?.withDeleted && {
                    deleted: false,
                }),
            },
            { ...options, rawResult: true }
        );
    }

    async softDeleteMany(
        find?: RootFilterQuery<Entity>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UpdateResult<Entity>> {
        // Allow find to be optional, but if provided it must be a valid object
        if (
            find !== undefined &&
            (typeof find !== 'object' || Object.keys(find).length === 0)
        ) {
            throw new Error(
                'If provided, find criteria must be a non-empty object'
            );
        }

        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;

        return this._repository.updateMany(
            {
                ...(find || {}),
                deleted: false,
            },
            {
                $set: {
                    deletedAt: new Date(),
                    deleted: true,
                    ...(actionBy && { deletedBy: actionBy }),
                },
            },
            { ...options, rawResult: true }
        );
    }

    async restoreMany(
        find?: RootFilterQuery<Entity>,
        options?: IDatabaseSaveOptions
    ): Promise<UpdateResult<Entity>> {
        // Allow find to be optional, but if provided it must be a valid object
        if (
            find !== undefined &&
            (typeof find !== 'object' || Object.keys(find).length === 0)
        ) {
            throw new Error(
                'If provided, find criteria must be a non-empty object'
            );
        }

        const actionBy = options?.actionBy
            ? typeof options.actionBy === 'string'
                ? new Types.ObjectId(options.actionBy)
                : options.actionBy
            : undefined;

        return this._repository.updateMany(
            {
                ...(find || {}),
                deleted: true,
            },
            {
                $set: {
                    deletedAt: undefined,
                    deletedBy: undefined,
                    deleted: false,
                    updatedAt: new Date(),
                    ...(actionBy && { updatedBy: actionBy }),
                },
            },
            { ...options, rawResult: true }
        );
    }

    // Raw
    async aggregate<AggregateResponse, AggregatePipeline extends PipelineStage>(
        pipelines: AggregatePipeline[],
        options?: IDatabaseAggregateOptions
    ): Promise<AggregateResponse[]> {
        if (!Array.isArray(pipelines)) {
            throw new Error('Must in array');
        }

        const newPipelines: PipelineStage[] = [
            {
                $match: {
                    ...(!options?.withDeleted && {
                        deleted: false,
                    }),
                },
            },
            ...pipelines,
        ];

        const aggregate =
            this._repository.aggregate<AggregateResponse>(newPipelines);

        if (options?.session) {
            aggregate.session(options?.session);
        }

        return aggregate;
    }

    async findAllAggregate<
        AggregateResponse,
        AggregatePipeline extends PipelineStage = PipelineStage,
    >(
        pipelines: AggregatePipeline[],
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<AggregateResponse[]> {
        if (!Array.isArray(pipelines)) {
            throw new Error('Must in array');
        }

        const newPipelines: PipelineStage[] = [
            {
                $match: {
                    ...(!options?.withDeleted && {
                        deleted: false,
                    }),
                },
            },
            ...pipelines,
        ];

        if (options?.order) {
            const keysOrder = Object.keys(options?.order);
            newPipelines.push({
                $sort: keysOrder.reduce(
                    (a, b) => ({
                        ...a,
                        [b]:
                            options.order![b] ===
                            ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC
                                ? 1
                                : -1,
                    }),
                    {}
                ),
            });
        }

        if (options?.paging) {
            newPipelines.push(
                {
                    $limit: options.paging.limit + options.paging.offset,
                },
                { $skip: options.paging.offset }
            );
        }

        const aggregate =
            this._repository.aggregate<AggregateResponse>(newPipelines);

        if (options?.session) {
            aggregate.session(options?.session);
        }

        return aggregate;
    }

    async getTotalAggregate<AggregatePipeline extends PipelineStage>(
        pipelines: AggregatePipeline[],
        options?: IDatabaseAggregateOptions
    ): Promise<number> {
        if (!Array.isArray(pipelines)) {
            throw new Error('Must in array');
        }

        const newPipelines: PipelineStage[] = [
            {
                $match: {
                    ...(!options?.withDeleted && {
                        deleted: false,
                    }),
                },
            },
            ...pipelines,
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                },
            },
        ];

        const aggregate = this._repository.aggregate(newPipelines);

        if (options?.session) {
            aggregate.session(options.session);
        }

        const raw = await aggregate;
        return raw && raw.length > 0 ? raw[0].count : 0;
    }

    model(): Model<Entity> {
        return this._repository;
    }
}
