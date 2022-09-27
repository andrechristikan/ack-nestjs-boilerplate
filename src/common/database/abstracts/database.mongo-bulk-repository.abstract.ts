import { Model, Types } from 'mongoose';
import { IDatabaseBulkRepositoryAbstract } from 'src/common/database/interfaces/database.bulk.repository.interface';
import {
    IDatabaseCreateManyOptions,
    IDatabaseDeleteOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
} from 'src/common/database/interfaces/database.interface';

export abstract class DatabaseMongoBulkRepositoryAbstract<T>
    implements IDatabaseBulkRepositoryAbstract
{
    protected _repository: Model<T>;

    constructor(repository: Model<T>) {
        this._repository = repository;
    }

    async createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        try {
            await this._repository.insertMany(data, {
                session: options ? options.session : undefined,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteManyById(
        _id: string[],
        options?: IDatabaseDeleteOptions
    ): Promise<boolean> {
        const map: Types.ObjectId[] = _id.map((val) => new Types.ObjectId(val));

        try {
            await this._repository.deleteMany(
                {
                    _id: {
                        $in: map,
                    },
                },
                {
                    session: options ? options.session : undefined,
                }
            );

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean> {
        try {
            await this._repository.deleteMany(find, {
                session: options ? options.session : undefined,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async softDeleteManyById(
        _id: string[],
        options?: IDatabaseDeleteOptions
    ): Promise<boolean> {
        const map: Types.ObjectId[] = _id.map((val) => new Types.ObjectId(val));

        try {
            await this._repository.updateMany(
                {
                    _id: {
                        $in: map,
                    },
                    deletedAt: {
                        $exists: true,
                    },
                },
                {
                    $set: {
                        deletedAt: new Date(),
                    },
                },
                {
                    session: options ? options.session : undefined,
                }
            );

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async softDeleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean> {
        try {
            await this._repository.updateMany(
                {
                    ...find,
                    deletedAt: {
                        $exists: true,
                    },
                },
                {
                    $set: {
                        deletedAt: new Date(),
                    },
                },
                {
                    session: options ? options.session : undefined,
                }
            );

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async restore(
        _id: string[],
        options?: IDatabaseRestoreOptions
    ): Promise<boolean> {
        const map: Types.ObjectId[] = _id.map((val) => new Types.ObjectId(val));

        try {
            await this._repository.updateMany(
                {
                    _id: {
                        $in: map,
                    },
                    deletedAt: {
                        $exists: true,
                    },
                },
                {
                    $set: {
                        deletedAt: undefined,
                    },
                },
                {
                    session: options ? options.session : undefined,
                }
            );

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async updateMany<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
    ): Promise<boolean> {
        try {
            if (options && options.withDeleted) {
                find = {
                    ...find,
                    deletedAt: {
                        $exists: true,
                    },
                };
            } else {
                find = {
                    ...find,
                    deletedAt: {
                        $exists: false,
                    },
                };
            }

            await this._repository.updateMany(
                find,
                {
                    $set: data,
                },
                {
                    session: options ? options.session : undefined,
                }
            );

            return true;
        } catch (err: any) {
            throw err;
        }
    }
}
