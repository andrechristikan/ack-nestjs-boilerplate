import { Model, PipelineStage, PopulateOptions, Types } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
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
            if (Array.isArray(this._populateOnFind)) {
                for (const populate of this._populateOnFind) {
                    findAll.populate(populate);
                }
            } else {
                findAll.populate(this._populateOnFind);
            }
        }

        if (options && options.session) {
            findAll.session(options.session);
        }

        return findAll.lean();
    }

    async findOne<Y = T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<Y> {
        const findOne = this._repository.findOne(find);

        if (options && options.select) {
            findOne.select(options.select);
        }

        if (options && options.populate) {
            if (Array.isArray(this._populateOnFind)) {
                for (const populate of this._populateOnFind) {
                    findOne.populate(populate);
                }
            } else {
                findOne.populate(this._populateOnFind);
            }
        }

        if (options && options.session) {
            findOne.session(options.session);
        }

        return findOne.lean();
    }

    async findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Y> {
        const findOne = this._repository.findById(_id);

        if (options && options.select) {
            findOne.select(options.select);
        }

        if (options && options.populate) {
            if (Array.isArray(this._populateOnFind)) {
                for (const populate of this._populateOnFind) {
                    findOne.populate(populate);
                }
            } else {
                findOne.populate(this._populateOnFind);
            }
        }

        if (options && options.session) {
            findOne.session(options.session);
        }

        return findOne.lean();
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number> {
        const count = this._repository.countDocuments(find);

        if (options && options.session) {
            count.session(options.session);
        }

        return count;
    }

    async exists(
        find: Record<string, any>,
        options?: IDatabaseExistOptions
    ): Promise<boolean> {
        const exist = this._repository.exists({
            ...find,
            _id: {
                $nin: new Types.ObjectId(
                    options && options.excludeId ? options.excludeId : undefined
                ),
            },
        });

        if (options && options.session) {
            exist.session(options.session);
        }

        const result = await exist;

        return result ? true : false;
    }

    async aggregate<N>(
        pipeline: Record<string, any>[],
        options?: IDatabaseOptions
    ): Promise<N[]> {
        const aggregate = this._repository.aggregate<N>(
            pipeline as PipelineStage[]
        );

        if (options && options.session) {
            aggregate.session(options.session);
        }

        return aggregate;
    }

    async create<N>(data: N, options?: IDatabaseCreateOptions): Promise<T> {
        const dataCreate: Record<string, any> = data;
        if (options && options._id) {
            dataCreate._id = new Types.ObjectId(options._id);
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
        return this._repository
            .findByIdAndUpdate(
                _id,
                {
                    $set: data,
                },
                { new: true }
            )
            .session(options ? options.session : undefined);
    }

    async updateOne<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
    ): Promise<T> {
        return this._repository
            .findByIdAndUpdate(
                find,
                {
                    $set: data,
                },
                { new: true }
            )
            .session(options ? options.session : undefined);
    }

    async deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<T> {
        return this._repository
            .findOneAndDelete(find, { new: true })
            .session(options ? options.session : undefined);
    }

    async deleteOneById(_id: string, options?: IDatabaseOptions): Promise<T> {
        return this._repository
            .findByIdAndDelete(_id, { new: true })
            .session(options ? options.session : undefined);
    }
}
