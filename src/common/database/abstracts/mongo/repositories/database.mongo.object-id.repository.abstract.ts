import {
    ClientSession,
    Model,
    PipelineStage,
    PopulateOptions,
    Types,
    Document,
} from 'mongoose';
import { DatabaseBaseRepositoryAbstract } from 'src/common/database/abstracts/database.base-repository.abstract';
import { DATABASE_DELETED_AT_FIELD_NAME } from 'src/common/database/constants/database.constant';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseRestoreManyOptions,
    IDatabaseRawOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';

export abstract class DatabaseMongoObjectIdRepositoryAbstract<
    Entity,
    EntityDocument
> extends DatabaseBaseRepositoryAbstract<EntityDocument> {
    protected _repository: Model<Entity>;
    protected _joinOnFind?: PopulateOptions | PopulateOptions[];

    constructor(
        repository: Model<Entity>,
        options?: PopulateOptions | PopulateOptions[]
    ) {
        super();

        this._repository = repository;
        this._joinOnFind = options;
    }

    async findAll<T = Entity>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions<ClientSession>
    ): Promise<T[]> {
        const findAll = this._repository.find<Entity>(find);

        if (options?.withDeleted) {
            findAll.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            findAll.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.select) {
            findAll.select(options.select);
        }

        if (options?.paging) {
            findAll.limit(options.paging.limit).skip(options.paging.offset);
        }

        if (options?.order) {
            findAll.sort(options.order);
        }

        if (options?.join) {
            findAll.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            findAll.session(options.session);
        }

        return findAll.lean() as any;
    }

    async findAllDistinct<T = Entity>(
        fieldDistinct: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions<ClientSession>
    ): Promise<T[]> {
        const findAll = this._repository.distinct<Entity>(fieldDistinct, find);

        if (options?.withDeleted) {
            findAll.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            findAll.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.select) {
            findAll.select(options.select);
        }

        if (options?.paging) {
            findAll.limit(options.paging.limit).skip(options.paging.offset);
        }

        if (options?.order) {
            findAll.sort(options.order);
        }

        if (options?.join) {
            findAll.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            findAll.session(options.session);
        }

        return findAll.lean() as any;
    }

    async findOne<T = EntityDocument>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<T> {
        const findOne = this._repository.findOne<EntityDocument>(find);

        if (options?.withDeleted) {
            findOne.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            findOne.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.select) {
            findOne.select(options.select);
        }

        if (options?.join) {
            findOne.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            findOne.session(options.session);
        }

        if (options?.order) {
            findOne.sort(options.order);
        }

        return findOne.exec() as any;
    }

    async findOneById<T = EntityDocument>(
        _id: string,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<T> {
        const findOne = this._repository.findById<EntityDocument>(
            new Types.ObjectId(_id)
        );

        if (options?.withDeleted) {
            findOne.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            findOne.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.select) {
            findOne.select(options.select);
        }

        if (options?.join) {
            findOne.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            findOne.session(options.session);
        }

        if (options?.order) {
            findOne.sort(options.order);
        }

        return findOne.exec() as any;
    }

    async findOneAndLock<T = EntityDocument>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<T> {
        const findOne = this._repository.findOneAndUpdate<EntityDocument>(
            find,
            {
                new: true,
                useFindAndModify: false,
            }
        );

        if (options?.withDeleted) {
            findOne.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            findOne.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.select) {
            findOne.select(options.select);
        }

        if (options?.join) {
            findOne.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            findOne.session(options.session);
        }

        if (options?.order) {
            findOne.sort(options.order);
        }

        return findOne.exec() as T;
    }

    async findOneByIdAndLock<T = EntityDocument>(
        _id: string,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<T> {
        const findOne = this._repository.findByIdAndUpdate(
            new Types.ObjectId(_id),
            {
                new: true,
                useFindAndModify: false,
            }
        );

        if (options?.withDeleted) {
            findOne.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            findOne.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.select) {
            findOne.select(options.select);
        }

        if (options?.join) {
            findOne.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            findOne.session(options.session);
        }

        if (options?.order) {
            findOne.sort(options.order);
        }

        return findOne.exec() as T;
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions<ClientSession>
    ): Promise<number> {
        const count = this._repository.countDocuments(find);

        if (options?.withDeleted) {
            count.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            count.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.session) {
            count.session(options.session);
        }

        if (options?.join) {
            count.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        return count;
    }

    async exists(
        find: Record<string, any>,
        options?: IDatabaseExistOptions<ClientSession>
    ): Promise<boolean> {
        if (options?.excludeId) {
            find = {
                ...find,
                _id: {
                    $nin:
                        options?.excludeId.map(
                            (val) => new Types.ObjectId(val)
                        ) ?? [],
                },
            };
        }

        const exist = this._repository.exists(find);
        if (options?.withDeleted) {
            exist.or([
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
                {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                },
            ]);
        } else {
            exist.where(DATABASE_DELETED_AT_FIELD_NAME).exists(false);
        }

        if (options?.session) {
            exist.session(options.session);
        }

        if (options?.join) {
            exist.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        const result = await exist;
        return result ? true : false;
    }

    async create<Dto = any>(
        data: Dto,
        options?: IDatabaseCreateOptions<ClientSession>
    ): Promise<EntityDocument> {
        const dataCreate: Record<string, any> = data;

        if (options?._id) {
            dataCreate._id = new Types.ObjectId(options?._id);
        }

        const created = await this._repository.create([dataCreate], {
            session: options ? options.session : undefined,
        });

        return created[0] as EntityDocument;
    }

    async save(
        repository: EntityDocument & Document<Types.ObjectId>,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        return repository.save(options);
    }

    async delete(
        repository: EntityDocument & Document<Types.ObjectId>,
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        return repository.deleteOne(options);
    }

    async softDelete(
        repository: EntityDocument &
            Document<Types.ObjectId> & { deletedAt?: Date },
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        repository.deletedAt = new Date();
        return repository.save(options);
    }

    async restore(
        repository: EntityDocument &
            Document<Types.ObjectId> & { deletedAt?: Date },
        options?: IDatabaseSaveOptions
    ): Promise<EntityDocument> {
        repository.deletedAt = undefined;
        return repository.save(options);
    }

    // bulk
    async createMany<Dto>(
        data: Dto[],
        options?: IDatabaseCreateManyOptions<ClientSession>
    ): Promise<boolean> {
        const dataCreate: Record<string, any>[] = data.map(
            (val: Record<string, any>) => ({
                ...val,
                _id: new Types.ObjectId(val._id),
            })
        );

        const create = this._repository.insertMany(dataCreate, {
            session: options ? options.session : undefined,
        });

        try {
            await create;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async deleteManyByIds(
        _id: string[],
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean> {
        const del = this._repository.deleteMany({
            _id: {
                $in: _id.map((val) => new Types.ObjectId(val)),
            },
        });

        if (options?.session) {
            del.session(options.session);
        }

        if (options?.join) {
            del.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        try {
            await del;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean> {
        const del = this._repository.deleteMany(find);

        if (options?.session) {
            del.session(options.session);
        }

        if (options?.join) {
            del.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        try {
            await del;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async softDeleteManyByIds(
        _id: string[],
        options?: IDatabaseSoftDeleteManyOptions<ClientSession>
    ): Promise<boolean> {
        const softDel = this._repository
            .updateMany(
                {
                    _id: {
                        $in: _id.map((val) => new Types.ObjectId(val)),
                    },
                },
                {
                    $set: {
                        deletedAt: new Date(),
                    },
                }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(false);

        if (options?.session) {
            softDel.session(options.session);
        }

        if (options?.join) {
            softDel.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        try {
            await softDel;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async softDeleteMany(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteManyOptions<ClientSession>
    ): Promise<boolean> {
        const softDel = this._repository
            .updateMany(find, {
                $set: {
                    deletedAt: new Date(),
                },
            })
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(false);

        if (options?.session) {
            softDel.session(options.session);
        }

        if (options?.join) {
            softDel.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        try {
            await softDel;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async restoreManyByIds(
        _id: string[],
        options?: IDatabaseRestoreManyOptions<ClientSession>
    ): Promise<boolean> {
        const rest = this._repository
            .updateMany(
                {
                    _id: {
                        $in: _id.map((val) => new Types.ObjectId(val)),
                    },
                },
                {
                    $set: {
                        deletedAt: undefined,
                    },
                }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(true);

        if (options?.session) {
            rest.session(options.session);
        }

        if (options?.join) {
            rest.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        try {
            await rest;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async restoreMany(
        find: Record<string, any>,
        options?: IDatabaseRestoreManyOptions<ClientSession>
    ): Promise<boolean> {
        const rest = this._repository
            .updateMany(find, {
                $set: {
                    deletedAt: undefined,
                },
            })
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(true);

        if (options?.session) {
            rest.session(options.session);
        }

        if (options?.join) {
            rest.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        try {
            await rest;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async updateMany<Dto>(
        find: Record<string, any>,
        data: Dto,
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean> {
        const update = this._repository
            .updateMany(find, {
                $set: data,
            })
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(false);

        if (options?.session) {
            update.session(options.session as ClientSession);
        }

        if (options?.join) {
            update.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        try {
            await update;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    // raw
    async raw<RawResponse, RawQuery = PipelineStage[]>(
        rawOperation: RawQuery,
        options?: IDatabaseRawOptions
    ): Promise<RawResponse[]> {
        if (!Array.isArray(rawOperation)) {
            throw new Error('Must in array');
        }

        const pipeline: PipelineStage[] = rawOperation;

        if (options?.withDeleted) {
            pipeline.push({
                $match: {
                    $or: [
                        {
                            [DATABASE_DELETED_AT_FIELD_NAME]: {
                                $exists: false,
                            },
                        },
                        {
                            [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: true },
                        },
                    ],
                },
            });
        } else {
            pipeline.push({
                $match: {
                    [DATABASE_DELETED_AT_FIELD_NAME]: { $exists: false },
                },
            });
        }

        const aggregate = this._repository.aggregate<RawResponse>(pipeline);

        if (options?.session) {
            aggregate.session(options?.session);
        }

        return aggregate;
    }

    async model(): Promise<Model<Entity>> {
        return this._repository;
    }
}
