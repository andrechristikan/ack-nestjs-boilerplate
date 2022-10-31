import { ClientSession, Model, PipelineStage, PopulateOptions } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
    IDatabaseRawOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseRestoreManyOptions,
    IDatabaseUpdateOptions,
    IDatabaseDeleteOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';

export abstract class DatabaseMongoRepositoryAbstract<T>
    implements IDatabaseRepository<T>
{
    protected _repository: Model<T>;
    protected _joinOnFind?: PopulateOptions | PopulateOptions[];

    constructor(
        repository: Model<T>,
        options?: PopulateOptions | PopulateOptions[]
    ) {
        this._repository = repository;
        this._joinOnFind = options;
    }

    async findAll<Y = T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions<ClientSession>
    ): Promise<Y[]> {
        const findAll = this._repository.find(find);

        if (options && options.withDeleted) {
            findAll.where('deletedAt').exists(true);
        } else {
            findAll.where('deletedAt').exists(false);
        }

        if (options && options.select) {
            findAll.select(options.select);
        }

        if (
            options &&
            options.limit !== undefined &&
            options.skip !== undefined
        ) {
            findAll.limit(options.limit).skip(options.skip);
        }

        if (options && options.sort) {
            findAll.sort(options.sort);
        }

        if (options && options.join) {
            findAll.populate(this._joinOnFind);
        }

        if (options && options.session) {
            findAll.session(options.session);
        }

        return findAll.lean();
    }

    async findOne<Y = T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<Y> {
        const findOne = this._repository.findOne(find);

        if (options && options.withDeleted) {
            findOne.where('deletedAt').exists(true);
        } else {
            findOne.where('deletedAt').exists(false);
        }

        if (options && options.select) {
            findOne.select(options.select);
        }

        if (options && options.join) {
            findOne.populate(this._joinOnFind);
        }

        if (options && options.session) {
            findOne.session(options.session);
        }

        if (options && options.sort) {
            findOne.sort(options.sort);
        }

        return findOne.lean();
    }

    async findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<Y> {
        const findOne = this._repository.findById(_id);

        if (options && options.withDeleted) {
            findOne.where('deletedAt').exists(true);
        } else {
            findOne.where('deletedAt').exists(false);
        }

        if (options && options.select) {
            findOne.select(options.select);
        }

        if (options && options.join) {
            findOne.populate(this._joinOnFind);
        }

        if (options && options.session) {
            findOne.session(options.session);
        }

        if (options && options.sort) {
            findOne.sort(options.sort);
        }

        return findOne.lean();
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions<ClientSession>
    ): Promise<number> {
        const count = this._repository.countDocuments(find);

        if (options && options.withDeleted) {
            count.where('deletedAt').exists(true);
        } else {
            count.where('deletedAt').exists(false);
        }

        if (options && options.session) {
            count.session(options.session);
        }

        if (options && options.join) {
            count.populate(this._joinOnFind);
        }

        return count;
    }

    async exists(
        find: Record<string, any>,
        options?: IDatabaseExistOptions<ClientSession>
    ): Promise<boolean> {
        const exist = this._repository.exists({
            ...find,
            _id: {
                $nin: options && options.excludeId ? options.excludeId : [],
            },
        });

        if (options && options.withDeleted) {
            exist.where('deletedAt').exists(true);
        } else {
            exist.where('deletedAt').exists(false);
        }

        if (options && options.session) {
            exist.session(options.session);
        }

        if (options && options.join) {
            exist.populate(this._joinOnFind);
        }

        const result = await exist;
        return result ? true : false;
    }

    async raw<N, R = PipelineStage[]>(
        rawOperation: R,
        options?: IDatabaseRawOptions<ClientSession>
    ): Promise<N[]> {
        if (!Array.isArray(rawOperation)) {
            throw new Error('Must in array');
        }

        const aggregate = this._repository.aggregate<N>(rawOperation);

        if (options && options.session) {
            aggregate.session(options.session);
        }

        return aggregate;
    }

    async create<N>(
        data: N,
        options?: IDatabaseCreateOptions<ClientSession>
    ): Promise<T> {
        const dataCreate: Record<string, any> = data;
        if (options && options._id) {
            dataCreate._id = options._id;
        }

        const create = await this._repository.create([dataCreate], {
            session: options ? options.session : undefined,
        });

        return create[0];
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
            .where('deletedAt')
            .exists(false);

        if (options && options.join) {
            update.populate(this._joinOnFind);
        }

        if (options && options.session) {
            update.session(options.session);
        }

        return update;
    }

    async updateOne<N>(
        find: Record<string, any>,
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
            .where('deletedAt')
            .exists(false);

        if (options && options.join) {
            update.populate(this._joinOnFind);
        }

        if (options && options.session) {
            update.session(options.session);
        }

        return update;
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions<ClientSession>
    ): Promise<T> {
        const del = this._repository.findOneAndDelete(find, { new: true });

        if (options && options.join) {
            del.populate(this._joinOnFind);
        }

        if (options && options.session) {
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

        if (options && options.join) {
            del.populate(this._joinOnFind);
        }

        if (options && options.session) {
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
            .where('deletedAt')
            .exists(false);

        if (options && options.join) {
            del.populate(this._joinOnFind);
        }

        if (options && options.session) {
            del.session(options.session);
        }

        return del;
    }

    async softDeleteOne(
        find: Record<string, any>,
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
            .where('deletedAt')
            .exists(false);

        if (options && options.join) {
            del.populate(this._joinOnFind);
        }

        if (options && options.session) {
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
            .where('deletedAt')
            .exists(true);

        if (options && options.join) {
            rest.populate(this._joinOnFind);
        }

        if (options && options.session) {
            rest.session(options.session);
        }

        return rest;
    }

    async restoreOne(
        find: Record<string, any>,
        options?: IDatabaseRestoreOptions<ClientSession>
    ): Promise<T> {
        const rest = this._repository
            .findByIdAndUpdate(
                find,
                {
                    $set: { deletedAt: undefined },
                },
                { new: true }
            )
            .where('deletedAt')
            .exists(true);

        if (options && options.join) {
            rest.populate(this._joinOnFind);
        }

        if (options && options.session) {
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

    async deleteManyById(
        _id: string[],
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean> {
        const del = this._repository
            .deleteMany({
                _id: {
                    $in: _id,
                },
            })
            .where('deletedAt')
            .exists(false);

        if (options && options.session) {
            del.session(options.session);
        }

        if (options && options.join) {
            del.populate(this._joinOnFind);
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
        const del = this._repository
            .deleteMany(find)
            .where('deletedAt')
            .exists(false);

        if (options && options.session) {
            del.session(options.session);
        }

        if (options && options.join) {
            del.populate(this._joinOnFind);
        }

        try {
            await del;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async softDeleteManyById(
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
            .where('deletedAt')
            .exists(false);

        if (options && options.session) {
            softDel.session(options.session);
        }

        if (options && options.join) {
            softDel.populate(this._joinOnFind);
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
            .where('deletedAt')
            .exists(false);

        if (options && options.session) {
            softDel.session(options.session);
        }

        if (options && options.join) {
            softDel.populate(this._joinOnFind);
        }

        try {
            await softDel;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async restoreManyById(
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
            .where('deletedAt')
            .exists(true);

        if (options && options.session) {
            rest.session(options.session);
        }

        if (options && options.join) {
            rest.populate(this._joinOnFind);
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
            .where('deletedAt')
            .exists(true);

        if (options && options.session) {
            rest.session(options.session);
        }

        if (options && options.join) {
            rest.populate(this._joinOnFind);
        }

        try {
            await rest;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }

    async updateMany<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean> {
        const update = this._repository
            .updateMany(find, {
                $set: data,
            })
            .where('deletedAt')
            .exists(false);

        if (options && options.session) {
            update.session(options.session as ClientSession);
        }

        if (options && options.join) {
            update.populate(this._joinOnFind);
        }

        try {
            await update;
            return true;
        } catch (err: unknown) {
            throw err;
        }
    }
}
