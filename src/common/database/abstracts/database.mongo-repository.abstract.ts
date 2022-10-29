import { ClientSession, Model, PipelineStage, PopulateOptions } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalAggregateOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
    IDatabaseAggregateOptions,
    IDatabaseRepositoryJoinOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseRestoreManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';

export abstract class DatabaseMongoRepositoryAbstract<T>
    implements IDatabaseRepositoryAbstract<T>
{
    protected _repository: Model<T>;
    protected _joinOnFind?: PopulateOptions | PopulateOptions[];

    constructor(
        repository: Model<T>,
        options?:
            | IDatabaseRepositoryJoinOptions
            | IDatabaseRepositoryJoinOptions[]
    ) {
        this._repository = repository;
        this._joinOnFind = this.__joinOnFind(options);
    }

    private __joinOnFind(
        options?:
            | IDatabaseRepositoryJoinOptions
            | IDatabaseRepositoryJoinOptions[]
    ): PopulateOptions | PopulateOptions[] {
        if (options) {
            if (Array.isArray(options) && options.length > 0) {
                return this.__convertToJoinArray(
                    options as IDatabaseRepositoryJoinOptions[]
                );
            }

            return this.__convertToJoin(
                options as IDatabaseRepositoryJoinOptions
            );
        }

        return;
    }

    private __convertToJoin(
        options: IDatabaseRepositoryJoinOptions
    ): PopulateOptions {
        const populate: PopulateOptions = {
            path: options.field,
            match: options.foreignField,
            model: options.with,
        };

        if (options.deepJoin) {
            populate.populate = this.__joinOnFind(options.deepJoin);
        }

        return populate;
    }

    private __convertToJoinArray(
        options: IDatabaseRepositoryJoinOptions[]
    ): PopulateOptions[] {
        return options.map((val) => this.__convertToJoin(val));
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
            findAll.session(options.session as ClientSession);
        }

        return findAll.lean();
    }

    async findAllAggregate<N>(
        pipeline: PipelineStage[],
        options?: IDatabaseFindAllAggregateOptions<ClientSession>
    ): Promise<N[]> {
        if (options && options.withDeleted) {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: true },
                },
            });
        } else {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: false },
                },
            });
        }

        if (
            options &&
            options.limit !== undefined &&
            options.skip !== undefined
        ) {
            pipeline.push({
                $skip: options.skip,
            });

            pipeline.push({
                $limit: options.limit,
            });
        }

        if (options && options.sort) {
            pipeline.push({
                $sort: options.sort,
            });
        }

        const aggregate = this._repository.aggregate<N>(pipeline);

        if (options && options.session) {
            aggregate.session(options.session as ClientSession);
        }

        return aggregate;
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
            findOne.session(options.session as ClientSession);
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
            findOne.session(options.session as ClientSession);
        }

        if (options && options.sort) {
            findOne.sort(options.sort);
        }

        return findOne.lean();
    }

    async findOneAggregate<N>(
        pipeline: PipelineStage[],
        options?: IDatabaseAggregateOptions<ClientSession>
    ): Promise<N> {
        if (options && options.withDeleted) {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: true },
                },
            });
        } else {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: false },
                },
            });
        }

        pipeline.push({
            $limit: 1,
        });

        const aggregate = this._repository.aggregate<N>(pipeline);

        if (options && options.session) {
            aggregate.session(options.session as ClientSession);
        }

        const findOne = await aggregate;
        return findOne && findOne.length > 0 ? findOne[0] : undefined;
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
            count.session(options.session as ClientSession);
        }

        if (options && options.join) {
            count.populate(this._joinOnFind);
        }

        return count;
    }
    async getTotalAggregate(
        pipeline: PipelineStage[],
        options?: IDatabaseGetTotalAggregateOptions<ClientSession>
    ): Promise<number> {
        if (options && options.withDeleted) {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: true },
                },
            });
        } else {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: false },
                },
            });
        }

        pipeline.push({
            $group: {
                _id: options && options.field ? options.field : null,
                count: {
                    $sum: options && options.sumField ? options.sumField : 1,
                },
            },
        });

        const aggregate = this._repository.aggregate(pipeline);

        if (options && options.session) {
            aggregate.session(options.session as ClientSession);
        }

        const count = await aggregate;
        return count && count.length > 0 ? count[0].count : 0;
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
            exist.session(options.session as ClientSession);
        }

        if (options && options.join) {
            exist.populate(this._joinOnFind);
        }

        const result = await exist;
        return result ? true : false;
    }

    async aggregate<N>(
        pipeline: Record<string, any>[],
        options?: IDatabaseAggregateOptions<ClientSession>
    ): Promise<N[]> {
        if (options && options.withDeleted) {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: true },
                },
            });
        } else {
            pipeline.push({
                $match: {
                    deletedAt: { $exists: false },
                },
            });
        }

        const aggregate = this._repository.aggregate<N>(
            pipeline as PipelineStage[]
        );

        if (options && options.session) {
            aggregate.session(options.session as ClientSession);
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
        options?: IDatabaseOptions<ClientSession>
    ): Promise<T> {
        const update = this._repository.findByIdAndUpdate(
            _id,
            {
                $set: data,
            },
            { new: true }
        );

        if (options && options.withDeleted) {
            update.where('deletedAt').exists(true);
        } else {
            update.where('deletedAt').exists(false);
        }

        if (options && options.join) {
            update.populate(this._joinOnFind);
        }

        if (options && options.session) {
            update.session(options.session as ClientSession);
        }

        return update;
    }

    async updateOne<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions<ClientSession>
    ): Promise<T> {
        const update = this._repository.findOneAndUpdate(
            find,
            {
                $set: data,
            },
            { new: true }
        );

        if (options && options.withDeleted) {
            update.where('deletedAt').exists(true);
        } else {
            update.where('deletedAt').exists(false);
        }

        if (options && options.join) {
            update.populate(this._joinOnFind);
        }

        if (options && options.session) {
            update.session(options.session as ClientSession);
        }

        return update;
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions<ClientSession>
    ): Promise<T> {
        const del = this._repository.findOneAndDelete(find, { new: true });

        if (options && options.withDeleted) {
            del.where('deletedAt').exists(true);
        } else {
            del.where('deletedAt').exists(false);
        }

        if (options && options.join) {
            del.populate(this._joinOnFind);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
        }

        return del;
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseOptions<ClientSession>
    ): Promise<T> {
        const del = this._repository.findByIdAndDelete(_id, {
            new: true,
        });

        if (options && options.withDeleted) {
            del.where('deletedAt').exists(true);
        } else {
            del.where('deletedAt').exists(false);
        }

        if (options && options.join) {
            del.populate(this._joinOnFind);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
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
            del.session(options.session as ClientSession);
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
            del.session(options.session as ClientSession);
        }

        return del;
    }

    async restore(
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
            rest.session(options.session as ClientSession);
        }

        return rest;
    }

    // bulk
    async createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions<ClientSession>
    ): Promise<boolean> {
        const create = this._repository.insertMany(data, {
            session: options ? (options.session as ClientSession) : undefined,
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
        const del = this._repository.deleteMany({
            _id: {
                $in: _id,
            },
        });

        if (options && options.withDeleted) {
            del.where('deletedAt').exists(true);
        } else {
            del.where('deletedAt').exists(false);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
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
        const del = this._repository.deleteMany(find);

        if (options && options.withDeleted) {
            del.where('deletedAt').exists(true);
        } else {
            del.where('deletedAt').exists(false);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
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
            softDel.session(options.session as ClientSession);
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
            softDel.session(options.session as ClientSession);
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

    async restoreMany(
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
            rest.session(options.session as ClientSession);
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
        const update = this._repository.updateMany(find, {
            $set: data,
        });

        if (options && options.withDeleted) {
            update.where('deletedAt').exists(true);
        } else {
            update.where('deletedAt').exists(false);
        }

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
