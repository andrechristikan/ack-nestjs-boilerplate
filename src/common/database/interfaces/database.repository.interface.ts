import {
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
    IDatabaseManyOptions,
    IDatabaseRestoreManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseCreateManyOptions,
    IDatabaseUpdateOptions,
    IDatabaseDeleteOptions,
} from './database.interface';

export interface IDatabaseRepository<T> {
    findAll<Y = T>(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindAllOptions<any>
    ): Promise<Y[]>;

    findOne<Y = T>(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindOneOptions<any>
    ): Promise<Y>;

    findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions<any>
    ): Promise<Y>;

    getTotal(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseOptions<any>
    ): Promise<number>;

    exists(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseExistOptions<any>
    ): Promise<boolean>;

    raw<N, R>(rawOperation: R): Promise<N[]>;

    create<N>(data: N, options?: IDatabaseCreateOptions<any>): Promise<T>;

    updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseUpdateOptions<any>
    ): Promise<T>;

    updateOne<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseUpdateOptions<any>
    ): Promise<T>;

    deleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseDeleteOptions<any>
    ): Promise<T>;

    deleteOneById(
        _id: string,
        options?: IDatabaseDeleteOptions<any>
    ): Promise<T>;

    softDeleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions<any>
    ): Promise<T>;

    softDeleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteOptions<any>
    ): Promise<T>;

    restoreOneById(
        _id: string,
        options?: IDatabaseRestoreOptions<any>
    ): Promise<T>;

    restoreOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreOptions<any>
    ): Promise<T>;

    // bulk
    createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions<any>
    ): Promise<boolean>;

    deleteManyByIds(
        _id: string[],
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    deleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    softDeleteManyByIds(
        _id: string[],
        options?: IDatabaseSoftDeleteManyOptions<any>
    ): Promise<boolean>;

    softDeleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteManyOptions<any>
    ): Promise<boolean>;

    restoreManyByIds(
        _id: string[],
        options?: IDatabaseRestoreManyOptions<any>
    ): Promise<boolean>;

    restoreMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreManyOptions<any>
    ): Promise<boolean>;

    updateMany<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    model<N>(): Promise<N>;
}
