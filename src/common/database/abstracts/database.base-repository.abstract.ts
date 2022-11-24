import { ClientSession, PipelineStage } from 'mongoose';
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
        options?: IDatabaseFindAllOptions<ClientSession>
    ): Promise<Y[]>;

    abstract findOne<Y = T>(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<Y>;

    abstract findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions<ClientSession>
    ): Promise<Y>;

    abstract getTotal(
        find?: Record<string, any> | Record<string, any>[],
        options?: IDatabaseOptions<ClientSession>
    ): Promise<number>;

    abstract exists(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseExistOptions<ClientSession>
    ): Promise<boolean>;

    abstract raw<N, R = PipelineStage[]>(rawOperation: R): Promise<N[]>;

    abstract create<N>(
        data: N,
        options?: IDatabaseCreateOptions<ClientSession>
    ): Promise<T>;

    abstract updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseUpdateOptions<ClientSession>
    ): Promise<T>;

    abstract updateOne<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseUpdateOptions<ClientSession>
    ): Promise<T>;

    abstract deleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseDeleteOptions<ClientSession>
    ): Promise<T>;

    abstract deleteOneById(
        _id: string,
        options?: IDatabaseDeleteOptions<ClientSession>
    ): Promise<T>;

    abstract softDeleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions<ClientSession>
    ): Promise<T>;

    abstract softDeleteOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteOptions<ClientSession>
    ): Promise<T>;

    abstract restoreOneById(
        _id: string,
        options?: IDatabaseRestoreOptions<ClientSession>
    ): Promise<T>;

    abstract restoreOne(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreOptions<ClientSession>
    ): Promise<T>;

    abstract createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract deleteManyByIds(
        _id: string[],
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract deleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract softDeleteManyByIds(
        _id: string[],
        options?: IDatabaseSoftDeleteManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract softDeleteMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseSoftDeleteManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract restoreManyByIds(
        _id: string[],
        options?: IDatabaseRestoreManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract restoreMany(
        find: Record<string, any> | Record<string, any>[],
        options?: IDatabaseRestoreManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract updateMany<N>(
        find: Record<string, any> | Record<string, any>[],
        data: N,
        options?: IDatabaseManyOptions<ClientSession>
    ): Promise<boolean>;

    abstract model<N = T>(): Promise<N>;
}
