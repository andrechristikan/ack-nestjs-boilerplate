import {
    ClientSession,
    Model,
    PipelineStage,
    PopulateOptions,
    SortOrder,
} from 'mongoose';
import { DatabaseBaseRepositoryAbstract } from 'src/common/database/abstracts/database.base-repository.abstract';
import { DATABASE_DELETED_AT_FIELD_NAME } from 'src/common/database/constants/database.constant';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseRestoreManyOptions,
    IDatabaseUpdateOptions,
    IDatabaseDeleteOptions,
    IDatabaseRawOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';

export abstract class DatabaseMongoUUIDRepositoryAbstract<T>
    extends DatabaseBaseRepositoryAbstract<T>
    implements IDatabaseRepository<T>
{
    protected _repository: Model<T>;
    protected _joinOnFind?: PopulateOptions | PopulateOptions[];

    constructor(
        repository: Model<T>,
        options?: PopulateOptions | PopulateOptions[]
    ) {
        super();

        this._repository = repository;
        this._joinOnFind = options;
    }

    private _convertSort(sort: IPaginationSort): Record<string, number> {
        const data: Record<string, number> = {};
        Object.keys(sort).forEach((val) => {
            data[val] = sort[val] === ENUM_PAGINATION_SORT_TYPE.ASC ? 1 : -1;
        });

        return data;
    }

    async findAll<Y = T>(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindAllOptions<ClientSession>
    ): Promise<Y[]> {
        const findAll = this._repository.find(find);

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

        if (options?.sort) {
            findAll.sort(
                this._convertSort(options.sort) as { [key: string]: SortOrder }
            );
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

        return findAll.lean();
    }

    async findAllDistinct<Y = T>(
        fieldDistinct: string,
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindAllOptions<ClientSession>
    ): Promise<Y[]> {
        const findAll = this._repository.distinct(fieldDistinct, find);

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

        if (options?.sort) {
            findAll.sort(
                this._convertSort(options.sort) as { [key: string]: SortOrder }
            );
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

        return findAll.lean();
    }
    async findOne<Y = T>(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<Y> {
        const findOne = this._repository.findOne(find);

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

        if (options?.sort) {
            findOne.sort(
                this._convertSort(options.sort) as { [key: string]: SortOrder }
            );
        }

        return findOne.lean();
    }

    async findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<Y> {
        const findOne = this._repository.findById(_id);

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

        if (options?.sort) {
            findOne.sort(
                this._convertSort(options.sort) as { [key: string]: SortOrder }
            );
        }

        return findOne.lean();
    }

    async getTotal(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseOptions<ClientSession>
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
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseExistOptions<ClientSession>
    ): Promise<boolean> {
        const exist = this._repository.exists({
            ...find,
            _id: {
                $nin: options?.excludeId ?? [],
            },
        });

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

    async raw<N, R = PipelineStage[]>(
        rawOperation: R,
        options?: IDatabaseRawOptions
    ): Promise<N[]> {
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

        const aggregate = this._repository.aggregate<N>(pipeline);

        if (options?.session) {
            aggregate.session(options?.session);
        }

        return aggregate;
    }

    async create<N>(
        data: N,
        options?: IDatabaseCreateOptions<ClientSession>
    ): Promise<T> {
        const dataCreate: Record<string, any> = data;
        if (options?._id) {
            dataCreate._id = options._id;
        }

        const create = await this._repository.create([dataCreate], {
            session: options ? options.session : undefined,
        });

        return create[0].toObject();
    }

    async updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseUpdateOptions<ClientSession>
    ): Promise<T> {
        const update = this._repository
            .findByIdAndUpdate(
                _id,
                {
                    $set: data,
                },
                { new: true }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(false);

        if (options?.join) {
            update.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            update.session(options.session);
        }

        const updated = await update;
        return updated.toObject();
    }

    async updateOne<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseUpdateOptions<ClientSession>
    ): Promise<T> {
        const update = this._repository
            .findOneAndUpdate(
                find,
                {
                    $set: data,
                },
                { new: true }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(false);

        if (options?.join) {
            update.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            update.session(options.session);
        }

        const updated = await update;
        return updated.toObject();
    }

    async deleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseDeleteOptions<ClientSession>
    ): Promise<T> {
        const del = this._repository.findOneAndDelete(find, { new: true });

        if (options?.join) {
            del.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            del.session(options.session);
        }

        return del;
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseDeleteOptions<ClientSession>
    ): Promise<T> {
        const del = this._repository.findByIdAndDelete(_id, {
            new: true,
        });

        if (options?.join) {
            del.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            del.session(options.session);
        }

        return del;
    }

    async softDeleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions<ClientSession>
    ): Promise<T> {
        const del = this._repository
            .findByIdAndUpdate(
                _id,
                {
                    $set: { deletedAt: new Date() },
                },
                { new: true }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(false);

        if (options?.join) {
            del.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            del.session(options.session);
        }

        return del;
    }

    async softDeleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteOptions<ClientSession>
    ): Promise<T> {
        const del = this._repository
            .findOneAndUpdate(
                find,
                {
                    $set: { deletedAt: new Date() },
                },
                { new: true }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(false);

        if (options?.join) {
            del.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            del.session(options.session);
        }

        return del;
    }

    async restoreOneById(
        _id: string,
        options?: IDatabaseRestoreOptions<ClientSession>
    ): Promise<T> {
        const rest = this._repository
            .findByIdAndUpdate(
                _id,
                {
                    $set: { deletedAt: undefined },
                },
                { new: true }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(true);

        if (options?.join) {
            rest.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            rest.session(options.session);
        }

        return rest;
    }

    async restoreOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreOptions<ClientSession>
    ): Promise<T> {
        const rest = this._repository
            .findOneAndUpdate(
                find,
                {
                    $set: { deletedAt: undefined },
                },
                { new: true }
            )
            .where(DATABASE_DELETED_AT_FIELD_NAME)
            .exists(true);

        if (options?.join) {
            rest.populate(
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as PopulateOptions | PopulateOptions[])
            );
        }

        if (options?.session) {
            rest.session(options.session);
        }

        return rest;
    }

    // bulk
    async createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions<ClientSession>
    ): Promise<boolean> {
        const create = this._repository.insertMany(data, {
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
                $in: _id,
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
        find: Record<string, any> | Record<string, any>[],
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
                        $in: _id,
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
        find: Record<string, any> | Record<string, any>[],
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
                        $in: _id,
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
        find: Record<string, any> | Record<string, any>[],
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

    async updateMany<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
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

    async model<N = T>(): Promise<N> {
        return this._repository as N;
    }
}
