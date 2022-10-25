import { ClientSession, Model, PipelineStage, PopulateOptions } from 'mongoose';
import { DatabaseKey } from 'src/common/database/decorators/database.decorator';
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
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';

export abstract class DatabaseMongoRepositoryAbstract<T>
    implements IDatabaseRepositoryAbstract<T>
{
    protected _repository: Model<T>;
    protected _populateOnFind?: PopulateOptions | PopulateOptions[];

    constructor(
        repository: Model<T>,
        populateOnFind?: PopulateOptions | PopulateOptions[]
    ) {
        this._repository = repository;
        this._populateOnFind = populateOnFind;
    }

    async findAll<Y = T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
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

        if (options && options.populate) {
            findAll.populate(this._populateOnFind);
        }

        if (options && options.session) {
            findAll.session(options.session as ClientSession);
        }

        return findAll.lean();
    }

    async findAllAggregate<N>(
        pipeline: PipelineStage[],
        options?: IDatabaseFindAllAggregateOptions
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
        options?: IDatabaseFindOneOptions
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

        if (options && options.populate) {
            findOne.populate(this._populateOnFind);
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
        options?: IDatabaseFindOneOptions
    ): Promise<Y> {
        const findOne = this._repository.findById(DatabaseKey(_id));

        if (options && options.withDeleted) {
            findOne.where('deletedAt').exists(true);
        } else {
            findOne.where('deletedAt').exists(false);
        }

        if (options && options.select) {
            findOne.select(options.select);
        }

        if (options && options.populate) {
            findOne.populate(this._populateOnFind);
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
        options?: IDatabaseAggregateOptions
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
        options?: IDatabaseOptions
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

        if (options && options.populate) {
            count.populate(this._populateOnFind);
        }

        return count;
    }
    async getTotalAggregate(
        pipeline: PipelineStage[],
        options?: IDatabaseGetTotalAggregateOptions
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
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        const exist = this._repository.exists({
            ...find,
            _id: {
                $nin:
                    options && options.excludeId
                        ? options.excludeId.map((val) => DatabaseKey(val))
                        : [],
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

        if (options && options.populate) {
            exist.populate(this._populateOnFind);
        }

        const result = await exist;
        return result ? true : false;
    }

    async aggregate<N>(
        pipeline: Record<string, any>[],
        options?: IDatabaseAggregateOptions
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

    async create<N>(data: N, options?: IDatabaseCreateOptions): Promise<T> {
        const dataCreate: Record<string, any> = data;
        if (options && options._id) {
            dataCreate._id = DatabaseKey(options._id);
        }

        const create = await this._repository.create([dataCreate], {
            session: options ? options.session : undefined,
        });

        return create[0];
    }

    async updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseOptions
    ): Promise<T> {
        console.log('hhh', DatabaseKey(_id));
        const update = this._repository.findByIdAndUpdate(
            DatabaseKey(_id),
            {
                $set: data,
            },
            { new: true }
        );

        // if (options && options.withDeleted) {
        //     update.where('deletedAt').exists(true);
        // } else {
        //     update.where('deletedAt').exists(false);
        // }

        // if (options && options.populate) {
        //     update.populate(this._populateOnFind);
        // }

        // if (options && options.session) {
        //     update.session(options.session as ClientSession);
        // }
        console.log('kkkk');

        return update;
    }

    async updateOne<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
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

        if (options && options.populate) {
            update.populate(this._populateOnFind);
        }

        if (options && options.session) {
            update.session(options.session as ClientSession);
        }

        return update;
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<T> {
        const del = this._repository.findOneAndDelete(find, { new: true });

        if (options && options.withDeleted) {
            del.where('deletedAt').exists(true);
        } else {
            del.where('deletedAt').exists(false);
        }

        if (options && options.populate) {
            del.populate(this._populateOnFind);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
        }

        return del;
    }

    async deleteOneById(_id: string, options?: IDatabaseOptions): Promise<T> {
        const del = this._repository.findByIdAndDelete(DatabaseKey(_id), {
            new: true,
        });

        if (options && options.withDeleted) {
            del.where('deletedAt').exists(true);
        } else {
            del.where('deletedAt').exists(false);
        }

        if (options && options.populate) {
            del.populate(this._populateOnFind);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
        }

        return del;
    }

    async softDeleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<T> {
        const del = this._repository
            .findByIdAndUpdate(
                DatabaseKey(_id),
                {
                    $set: { deletedAt: new Date() },
                },
                { new: true }
            )
            .where('deletedAt')
            .exists(false);

        if (options && options.populate) {
            del.populate(this._populateOnFind);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
        }

        return del;
    }

    async softDeleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
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

        if (options && options.populate) {
            del.populate(this._populateOnFind);
        }

        if (options && options.session) {
            del.session(options.session as ClientSession);
        }

        return del;
    }

    async restore(_id: string, options?: IDatabaseRestoreOptions): Promise<T> {
        const rest = this._repository
            .findByIdAndUpdate(
                DatabaseKey(_id),
                {
                    $set: { deletedAt: undefined },
                },
                { new: true }
            )
            .where('deletedAt')
            .exists(true);

        if (options && options.populate) {
            rest.populate(this._populateOnFind);
        }

        if (options && options.session) {
            rest.session(options.session as ClientSession);
        }

        return rest;
    }
}
