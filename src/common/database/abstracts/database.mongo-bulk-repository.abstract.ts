import { ClientSession, Model, PopulateOptions } from 'mongoose';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import {
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseRestoreManyOptions,
    IDatabaseRepositoryJoinOptions,
} from 'src/common/database/interfaces/database.interface';

export abstract class DatabaseMongoBulkRepositoryAbstract<T>
    implements IDatabaseBulkRepositoryAbstract
{
    protected _repository: Model<T>;
    protected _populateOnFind?: PopulateOptions | PopulateOptions[];

    constructor(
        repository: Model<T>,
        options?:
            | IDatabaseRepositoryJoinOptions
            | IDatabaseRepositoryJoinOptions[]
    ) {
        this._repository = repository;
        this._populateOnFind = this.__populateOnFind(options);
    }

    private __populateOnFind(
        options?:
            | IDatabaseRepositoryJoinOptions
            | IDatabaseRepositoryJoinOptions[]
    ): PopulateOptions | PopulateOptions[] {
        if (options) {
            if (Array.isArray(options) && options.length > 0) {
                return this.__convertToPopulateArray(
                    options as IDatabaseRepositoryJoinOptions[]
                );
            }

            return this.__convertToPopulate(
                options as IDatabaseRepositoryJoinOptions
            );
        }

        return;
    }

    private __convertToPopulate(
        options: IDatabaseRepositoryJoinOptions
    ): PopulateOptions {
        const populate: PopulateOptions = {
            path: options.field,
            match: options.foreignField,
            model: options.with,
        };

        if (options.deepJoin) {
            populate.populate = this.__populateOnFind(options.deepJoin);
        }

        return populate;
    }

    private __convertToPopulateArray(
        options: IDatabaseRepositoryJoinOptions[]
    ): PopulateOptions[] {
        return options.map((val) => this.__convertToPopulate(val));
    }

    async createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const create = this._repository.insertMany(data, {
            session: options ? (options.session as ClientSession) : undefined,
        });

        try {
            await create;
            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteManyById(
        _id: string[],
        options?: IDatabaseManyOptions
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

        if (options && options.populate) {
            del.populate(this._populateOnFind);
        }

        try {
            await del;
            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
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

        if (options && options.populate) {
            del.populate(this._populateOnFind);
        }

        try {
            await del;
            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async softDeleteManyById(
        _id: string[],
        options?: IDatabaseSoftDeleteManyOptions
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

        if (options && options.populate) {
            softDel.populate(this._populateOnFind);
        }

        try {
            await softDel;
            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async softDeleteMany(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteManyOptions
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

        if (options && options.populate) {
            softDel.populate(this._populateOnFind);
        }

        try {
            await softDel;
            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async restore(
        _id: string[],
        options?: IDatabaseRestoreManyOptions
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

        if (options && options.populate) {
            rest.populate(this._populateOnFind);
        }

        try {
            await rest;
            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async updateMany<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseManyOptions
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

        if (options && options.populate) {
            update.populate(this._populateOnFind);
        }

        try {
            await update;
            return true;
        } catch (err: any) {
            throw err;
        }
    }
}
