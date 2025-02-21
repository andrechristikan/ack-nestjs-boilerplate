import {
    Model,
    PipelineStage,
    PopulateOptions,
    UpdateQuery,
    UpdateWithAggregationPipeline,
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
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
    IDatabaseUpdateOptions,
} from 'src/common/database/interfaces/database.interface';
import { UpdateResult, DeleteResult, InsertManyResult } from 'mongodb';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { DatabaseSoftDeleteDto } from 'src/common/database/dtos/database.soft-delete.dto';
import { DatabaseEntityBase } from 'src/common/database/bases/database.entity';

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

    // Find
    async findAll<T = EntityDocument>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<T[]> {
        const repository = this._repository.find<T>({
            ...find,
            deleted: options?.withDeleted ?? false,
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
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const repository = this._repository.findOne<T>({
            ...find,
            deleted: options?.withDeleted ?? false,
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
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const repository = this._repository.findOne<T>({
            _id,
            deleted: options?.withDeleted ?? false,
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

    async findOneAndLock<T = EntityDocument>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const repository = this._repository.findOneAndUpdate<T>(
            {
                ...find,
                deleted: options?.withDeleted ?? false,
            },
            {
                new: true,
                useFindAndModify: false,
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
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const repository = this._repository.findOneAndUpdate<T>(
            {
                _id,
                deleted: options?.withDeleted ?? false,
            },
            {
                new: true,
                useFindAndModify: false,
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
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        const repository = this._repository.countDocuments({
            ...find,
            deleted: options?.withDeleted ?? false,
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
        find: Record<string, any>,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        const repository = this._repository.exists({
            ...find,
            deleted: options?.withDeleted ?? false,
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
            repository.where('_id').ne(options.excludeId);
        }

        const result = await repository;
        return result ? true : false;
    }

    async create<T extends Entity>(
        data: T,
        options?: IDatabaseCreateOptions
    ): Promise<EntityDocument> {
        const created = await this._repository.create([data], options);

        return created[0] as any;
    }

    // Action
    async update(
        find: Record<string, any>,
        data: UpdateQuery<Entity> | UpdateWithAggregationPipeline,
        options?: IDatabaseUpdateOptions
    ): Promise<EntityDocument> {
        return this._repository.findOneAndUpdate(
            {
                ...find,
                deleted: options?.withDeleted ?? false,
            },
            data,
            {
                ...options,
                new: true,
            }
        );
    }

    async delete(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<EntityDocument> {
        return this._repository.findOneAndDelete(
            {
                ...find,
                deleted: options?.withDeleted ?? false,
            },
            {
                ...options,
                new: false,
            }
        );
    }

    async save(
        repository: EntityDocument,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        return repository.save(options);
    }

    async join<T = any>(
        repository: EntityDocument,
        joins: PopulateOptions | (string | PopulateOptions)[]
    ): Promise<T> {
        return repository.populate(joins);
    }

    // Soft delete
    async softDelete(
        repository: EntityDocument,
        dto?: DatabaseSoftDeleteDto,
        options?: IDatabaseOptions
    ): Promise<EntityDocument> {
        repository.deletedAt = new Date();
        repository.deleted = true;
        repository.deletedBy = dto?.deletedBy;

        return repository.save(options);
    }

    async restore(
        repository: EntityDocument,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        repository.deletedAt = undefined;
        repository.deleted = false;
        repository.deletedBy = undefined;

        return repository.save(options);
    }

    // Bulk
    async createMany<T = Entity>(
        data: T[],
        options?: IDatabaseCreateManyOptions
    ): Promise<InsertManyResult<Entity>> {
        return this._repository.insertMany(data as any, {
            ...options,
            rawResult: true,
        });
    }

    async updateMany<T = Entity>(
        find: Record<string, any>,
        data: T,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult<Entity>> {
        return this._repository.updateMany(
            {
                ...find,
                deleted: options?.withDeleted ?? false,
            },
            {
                $set: data,
            },
            { ...options, rawResult: true }
        );
    }

    async updateManyRaw(
        find: Record<string, any>,
        data: UpdateQuery<Entity> | UpdateWithAggregationPipeline,
        options?: IDatabaseUpdateManyOptions
    ): Promise<UpdateResult<Entity>> {
        return this._repository.updateMany(
            {
                ...find,
                deleted: options?.withDeleted ?? false,
            },
            data,
            { ...options, rawResult: true }
        );
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<DeleteResult> {
        return this._repository.deleteMany(
            {
                ...find,
                deleted: options?.withDeleted ?? false,
            },
            { ...options, rawResult: true }
        );
    }

    async softDeleteMany(
        find: Record<string, any>,
        dto?: DatabaseSoftDeleteDto,
        options?: IDatabaseOptions
    ): Promise<UpdateResult<Entity>> {
        return this._repository.updateMany(
            {
                ...find,
                deleted: false,
            },
            {
                $set: {
                    deletedAt: new Date(),
                    deleted: true,
                    deletedBy: dto?.deletedBy,
                },
            },
            { ...options, rawResult: true }
        );
    }

    async restoreMany(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<UpdateResult<Entity>> {
        return this._repository.updateMany(
            {
                ...find,
                deleted: true,
            },
            {
                $set: {
                    deletedAt: undefined,
                    deleted: false,
                    deletedBy: undefined,
                },
            },
            { ...options, rawResult: true }
        );
    }

    // Raw
    async aggregate<
        AggregatePipeline extends PipelineStage,
        AggregateResponse = any,
    >(
        pipelines: AggregatePipeline[],
        options?: IDatabaseAggregateOptions
    ): Promise<AggregateResponse[]> {
        if (!Array.isArray(pipelines)) {
            throw new Error('Must in array');
        }

        const newPipelines: PipelineStage[] = [
            {
                $match: {
                    deleted: options?.withDeleted ?? false,
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
        AggregatePipeline extends PipelineStage,
        AggregateResponse = any,
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
                    deleted: options?.withDeleted ?? false,
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
                            options?.order[b] ===
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
                    deleted: options?.withDeleted ?? false,
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
            aggregate.session(options?.session);
        }

        const raw = await aggregate;
        return raw && raw.length > 0 ? raw[0].count : 0;
    }

    async model(): Promise<Model<Entity>> {
        return this._repository;
    }
}
