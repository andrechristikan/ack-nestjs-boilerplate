import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
    IDatabaseManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseRestoreManyOptions,
    IDatabaseUpdateOptions,
    IDatabaseDeleteOptions,
} from 'src/common/database/interfaces/database.interface';
import { IDatabaseRepository } from 'src/common/database/interfaces/database.repository.interface';
import { ENUM_PAGINATION_AVAILABLE_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IPaginationSort } from 'src/common/pagination/interfaces/pagination.interface';
import {
    FindManyOptions,
    FindOneOptions,
    FindOptionsOrder,
    FindOptionsRelations,
    FindOptionsSelect,
    FindOptionsWhere,
    Repository,
    In,
    QueryRunner,
    SelectQueryBuilder,
} from 'typeorm';

export abstract class DatabasePostgresRepositoryAbstract<T>
    implements IDatabaseRepository<T>
{
    protected _repository: Repository<T>;
    protected _joinOnFind?: FindOptionsRelations<T>;

    constructor(repository: Repository<T>, options?: FindOptionsRelations<T>) {
        this._repository = repository;
        this._joinOnFind = options;
    }

    private _convertToObjectOfBoolean(
        obj: Record<string, string | number>
    ): Record<string, boolean> {
        const keys: string[] = Object.keys(obj);
        const map: Record<string, boolean> = {};
        keys.forEach((val) => {
            map[val] =
                typeof obj[val] === 'string'
                    ? true
                    : obj[val] === 1
                    ? true
                    : false;
        });

        return map;
    }

    private _convertSort(
        sort: IPaginationSort
    ): Record<string, ENUM_PAGINATION_AVAILABLE_SORT_TYPE> {
        const data: Record<string, ENUM_PAGINATION_AVAILABLE_SORT_TYPE> = {};
        Object.keys(sort).forEach((val) => {
            data[val] =
                sort[val] === ENUM_PAGINATION_AVAILABLE_SORT_TYPE.ASC
                    ? ENUM_PAGINATION_AVAILABLE_SORT_TYPE.ASC
                    : ENUM_PAGINATION_AVAILABLE_SORT_TYPE.DESC;
        });

        return data;
    }

    private _updateEntity<T, N>(entity: T, data: N): T {
        Object.keys(data).forEach((val) => {
            entity[val] = data[val];
        });

        return entity;
    }

    async findAll<Y = T>(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindAllOptions<QueryRunner>
    ): Promise<Y[]> {
        const findAll: FindManyOptions<T> = {
            where: find,
        };

        if (options && options.withDeleted) {
            findAll.withDeleted = true;
        } else {
            findAll.withDeleted = false;
        }

        if (options && options.select) {
            findAll.select = this._convertToObjectOfBoolean(
                options.select
            ) as FindOptionsSelect<T>;
        }

        if (
            options &&
            options.limit !== undefined &&
            options.skip !== undefined
        ) {
            findAll.take = options.limit;
            findAll.skip = options.skip;
        }

        if (options && options.sort) {
            findAll.order = this._convertSort(
                options.sort
            ) as FindOptionsOrder<T>;
        }

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        if (options && options.session) {
            findAll.transaction = true;
        }

        return this._repository.find(findAll) as any;
    }

    async findOne<Y = T>(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindOneOptions<QueryRunner>
    ): Promise<Y> {
        const findOne: FindOneOptions<T> = {
            where: find,
        };

        if (options && options.withDeleted) {
            findOne.withDeleted = true;
        } else {
            findOne.withDeleted = false;
        }

        if (options && options.select) {
            findOne.select = this._convertToObjectOfBoolean(
                options.select
            ) as FindOptionsSelect<T>;
        }

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        if (options && options.session) {
            findOne.transaction = true;
        }

        if (options && options.sort) {
            findOne.order = this._convertSort(
                options.sort
            ) as FindOptionsOrder<T>;
        }

        return this._repository.findOneOrFail(findOne) as any;
    }

    async findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions<QueryRunner>
    ): Promise<Y> {
        const findOne: FindOneOptions<T> = {
            where: {
                _id: _id,
            } as FindOptionsWhere<any>,
        };

        if (options && options.withDeleted) {
            findOne.withDeleted = true;
        } else {
            findOne.withDeleted = false;
        }

        if (options && options.select) {
            findOne.select = this._convertToObjectOfBoolean(
                options.select
            ) as FindOptionsSelect<T>;
        }

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        if (options && options.sort) {
            findOne.order = this._convertSort(
                options.sort
            ) as FindOptionsOrder<T>;
        }

        if (options && options.session) {
            findOne.transaction = true;
        }

        return this._repository.findOneOrFail(findOne) as any;
    }

    async getTotal(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseOptions<QueryRunner>
    ): Promise<number> {
        const count: FindManyOptions<any> = {
            where: find,
        };

        if (options && options.withDeleted) {
            count.withDeleted = true;
        } else {
            count.withDeleted = false;
        }

        if (options && options.session) {
            count.transaction = true;
        }

        if (options && options.join) {
            count.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        return this._repository.count(count) as any;
    }

    async exists(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseExistOptions<QueryRunner>
    ): Promise<boolean> {
        const findOne: FindOneOptions<T> = {
            where: find,
            select: {
                _id: true,
            } as FindOptionsWhere<any>,
        };

        if (options && options.withDeleted) {
            findOne.withDeleted = true;
        } else {
            findOne.withDeleted = false;
        }

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        if (options && options.session) {
            findOne.transaction = true;
        }

        const exist: T = await this._repository.findOneOrFail(findOne);

        return exist ? true : false;
    }

    async raw<N, R = string>(rawOperation: R): Promise<N[]> {
        if (typeof rawOperation !== 'string') {
            throw new Error('Must in string');
        }

        return this._repository.query(rawOperation);
    }

    async create<N>(
        data: N,
        options?: IDatabaseCreateOptions<QueryRunner>
    ): Promise<T> {
        const dataCreate: Record<string, any> = data;
        if (options && options._id) {
            dataCreate._id = options._id;
        }

        const create = this._repository.create(dataCreate as T);
        return this._repository.save(create);
    }

    async updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseUpdateOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: { _id } as FindOptionsWhere<any>,
            withDeleted: false,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        let update = await this._repository.findOneOrFail(findOne);
        update = this._updateEntity(update, data);

        return this._repository.save(update, {
            transaction: options && options.session ? true : false,
        });
    }

    async updateOne<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseUpdateOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: find as FindOptionsWhere<any>,
            withDeleted: false,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        let update = await this._repository.findOneOrFail(findOne);
        update = this._updateEntity(update, data);

        return this._repository.save(update, {
            transaction: options && options.session ? true : false,
        });
    }

    async deleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseDeleteOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: find as FindOptionsWhere<any>,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        const del = await this._repository.findOneOrFail(findOne);
        await this._repository.remove(del, {
            transaction: options && options.session ? true : false,
        });

        return del;
    }

    async deleteOneById(
        _id: string,
        options?: IDatabaseDeleteOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: { _id } as FindOptionsWhere<any>,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        const del = await this._repository.findOneOrFail(findOne);
        await this._repository.remove(del, {
            transaction: options && options.session ? true : false,
        });

        return del;
    }

    async softDeleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: { _id } as FindOptionsWhere<any>,
            withDeleted: false,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        const del = await this._repository.findOneOrFail(findOne);
        await this._repository.softRemove(del, {
            transaction: options && options.session ? true : false,
        });

        return del;
    }

    async softDeleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: find as FindOptionsWhere<any>,
            withDeleted: false,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        const del = await this._repository.findOneOrFail(findOne);
        await this._repository.softRemove(del, {
            transaction: options && options.session ? true : false,
        });

        return del;
    }

    async restoreOneById(
        _id: string,
        options?: IDatabaseRestoreOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: { _id } as FindOptionsWhere<any>,
            withDeleted: true,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        const rec = await this._repository.findOneOrFail(findOne);
        await this._repository.recover(rec, {
            transaction: options && options.session ? true : false,
        });

        return rec;
    }

    async restoreOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreOptions<QueryRunner>
    ): Promise<T> {
        const findOne: FindOneOptions = {
            where: find as FindOptionsWhere<any>,
            withDeleted: true,
        };

        if (options && options.join) {
            findOne.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findOne.transaction = options && options.session ? true : false;

        const rec = await this._repository.findOneOrFail(findOne);
        await this._repository.recover(rec, {
            transaction: options && options.session ? true : false,
        });

        return rec;
    }

    // bulk
    async createMany<N>(data: N[]): Promise<boolean> {
        try {
            const create = this._repository.create(data as any[]);
            await this._repository.save(create);
            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteManyById(
        _id: string[],
        options?: IDatabaseManyOptions<QueryRunner>
    ): Promise<boolean> {
        const findAll: FindManyOptions<any> = {
            where: { _id: In(_id) },
            withDeleted: false,
        };

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findAll.transaction = options && options.session ? true : false;

        try {
            const del = await this._repository.find(findAll);
            await this._repository.remove(del, {
                transaction: options && options.session ? true : false,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async deleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseManyOptions<QueryRunner>
    ): Promise<boolean> {
        const findAll: FindManyOptions<any> = {
            where: find,
            withDeleted: false,
        };

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findAll.transaction = options && options.session ? true : false;

        try {
            const del = await this._repository.find(findAll);
            await this._repository.remove(del, {
                transaction: options && options.session ? true : false,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async softDeleteManyById(
        _id: string[],
        options?: IDatabaseSoftDeleteManyOptions<QueryRunner>
    ): Promise<boolean> {
        const findAll: FindManyOptions<any> = {
            where: {
                _id: In(_id),
            },
            withDeleted: false,
        };

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findAll.transaction = options && options.session ? true : false;

        try {
            const del = await this._repository.find(findAll);
            await this._repository.softRemove(del, {
                transaction: options && options.session ? true : false,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async softDeleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteManyOptions<QueryRunner>
    ): Promise<boolean> {
        const findAll: FindManyOptions<any> = {
            where: find,
            withDeleted: false,
        };

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findAll.transaction = options && options.session ? true : false;

        try {
            const del = await this._repository.find(findAll);
            await this._repository.softRemove(del, {
                transaction: options && options.session ? true : false,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async restoreManyById(
        _id: string[],
        options?: IDatabaseRestoreManyOptions<QueryRunner>
    ): Promise<boolean> {
        const findAll: FindManyOptions<any> = {
            where: {
                _id: In(_id),
            },
            withDeleted: true,
        };

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findAll.transaction = options && options.session ? true : false;

        try {
            const rec = await this._repository.find(findAll);
            await this._repository.recover(rec, {
                transaction: options && options.session ? true : false,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async restoreMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreManyOptions<QueryRunner>
    ): Promise<boolean> {
        const findAll: FindManyOptions<any> = {
            where: find,
            withDeleted: true,
        };

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findAll.transaction = options && options.session ? true : false;

        try {
            const rec = await this._repository.find(findAll);
            await this._repository.recover(rec, {
                transaction: options && options.session ? true : false,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async updateMany<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseManyOptions<QueryRunner>
    ): Promise<boolean> {
        const findAll: FindManyOptions = {
            where: find as FindOptionsWhere<any>,
            withDeleted: false,
        };

        if (options && options.join) {
            findAll.relations =
                typeof options.join === 'boolean'
                    ? this._joinOnFind
                    : (options.join as FindOptionsRelations<T>);
        }

        findAll.transaction = options && options.session ? true : false;

        try {
            let update = await this._repository.find(findAll);
            update = this._updateEntity(update, data);

            await this._repository.save(update, {
                transaction: options && options.session ? true : false,
            });

            return true;
        } catch (err: any) {
            throw err;
        }
    }

    async model<N = SelectQueryBuilder<T>>(): Promise<N> {
        return this._repository.createQueryBuilder() as N;
    }
}
