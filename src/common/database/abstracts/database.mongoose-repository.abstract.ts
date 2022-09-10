import { Model, PipelineStage, PopulateOptions, Types } from 'mongoose';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepositoryAbstract } from 'src/common/database/interfaces/database.repository.interface';

export abstract class DatabaseMongooseRepositoryAbstract<T>
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
        find: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<Y[]> {
        const findAll = this._repository.find(find);
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

        return findAll.lean();
    }

    async findOne<Y = T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<Y> {
        const findOne = this._repository.findOne(find);

        if (options && options.populate) {
            if (Array.isArray(this._populateOnFind)) {
                for (const populate of this._populateOnFind) {
                    findOne.populate(populate);
                }
            } else {
                findOne.populate(this._populateOnFind);
            }
        }

        return findOne.lean();
    }

    async findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Y> {
        const findOne = this._repository.findById(_id);

        if (options && options.populate) {
            if (Array.isArray(this._populateOnFind)) {
                for (const populate of this._populateOnFind) {
                    findOne.populate(populate);
                }
            } else {
                findOne.populate(this._populateOnFind);
            }
        }

        return findOne.lean();
    }

    async getTotal(find: Record<string, any>): Promise<number> {
        return this._repository.countDocuments(find);
    }

    async exists(
        find: Record<string, any>,
        excludeId?: string
    ): Promise<boolean> {
        const exist = await this._repository.exists({
            ...find,
            _id: { $nin: new Types.ObjectId(excludeId) },
        });

        return exist ? true : false;
    }

    async aggregate<N>(pipeline: Record<string, any>[]): Promise<N[]> {
        return this._repository.aggregate<N>(pipeline as PipelineStage[]);
    }

    async create<N>(data: N, options?: IDatabaseOptions): Promise<T> {
        const create = await this._repository.create([data], {
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
