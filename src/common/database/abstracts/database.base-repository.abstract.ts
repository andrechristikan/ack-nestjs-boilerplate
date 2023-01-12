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
} from 'src/common/database/interfaces/database.interface';

export abstract class DatabaseBaseRepositoryAbstract<T> {
    abstract findAll<Y = T>(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindAllOptions<any>
    ): Promise<Y[]>;

    abstract findAllDistinct<Y = T>(
        fieldDistinct: string,
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindAllOptions<any>
    ): Promise<Y[]>;

    abstract findOne<Y = T>(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindOneOptions<any>
    ): Promise<Y>;

    abstract findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions<any>
    ): Promise<Y>;

    abstract getTotal(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseOptions<any>
    ): Promise<number>;

    abstract exists(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseExistOptions<any>
    ): Promise<boolean>;

    abstract raw<N, R = any>(rawOperation: R): Promise<N[]>;

    abstract create<N>(
        data: N,
        options?: IDatabaseCreateOptions<any>
    ): Promise<T>;

    abstract updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseUpdateOptions<any>
    ): Promise<T>;

    abstract updateOne<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseUpdateOptions<any>
    ): Promise<T>;

    abstract deleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseDeleteOptions<any>
    ): Promise<T>;

    abstract deleteOneById(
        _id: string,
        options?: IDatabaseDeleteOptions<any>
    ): Promise<T>;

    abstract softDeleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions<any>
    ): Promise<T>;

    abstract softDeleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteOptions<any>
    ): Promise<T>;

    abstract restoreOneById(
        _id: string,
        options?: IDatabaseRestoreOptions<any>
    ): Promise<T>;

    abstract restoreOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreOptions<any>
    ): Promise<T>;

    abstract createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions<any>
    ): Promise<boolean>;

    abstract deleteManyByIds(
        _id: string[],
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    abstract deleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    abstract softDeleteManyByIds(
        _id: string[],
        options?: IDatabaseSoftDeleteManyOptions<any>
    ): Promise<boolean>;

    abstract softDeleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteManyOptions<any>
    ): Promise<boolean>;

    abstract restoreManyByIds(
        _id: string[],
        options?: IDatabaseRestoreManyOptions<any>
    ): Promise<boolean>;

    abstract restoreMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreManyOptions<any>
    ): Promise<boolean>;

    abstract updateMany<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    abstract model<N = T>(): Promise<N>;
}
