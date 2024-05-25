import { UpdateQuery, UpdateWithAggregationPipeline } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseCreateManyOptions,
    IDatabaseManyOptions,
    IDatabaseSoftDeleteManyOptions,
    IDatabaseRestoreManyOptions,
    IDatabaseRawOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseFindOneLockOptions,
    IDatabaseRawFindAllOptions,
    IDatabaseRawGetTotalOptions,
    IDatabaseJoinOptions,
} from 'src/common/database/interfaces/database.interface';

export abstract class DatabaseRepositoryAbstract<Entity = any> {
    abstract findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions<any>
    ): Promise<Entity[]>;

    abstract findAllDistinct(
        fieldDistinct: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions<any>
    ): Promise<Entity[]>;

    abstract findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions<any>
    ): Promise<Entity>;

    abstract findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions<any>
    ): Promise<Entity>;

    abstract findOneAndLock(
        find: Record<string, any>,
        options?: IDatabaseFindOneLockOptions<any>
    ): Promise<Entity>;

    abstract findOneByIdAndLock(
        _id: string,
        options?: IDatabaseFindOneLockOptions<any>
    ): Promise<Entity>;

    abstract getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions<any>
    ): Promise<number>;

    abstract exists(
        find: Record<string, any>,
        options?: IDatabaseExistOptions<any>
    ): Promise<boolean>;

    abstract create<Dto = any>(
        data: Dto,
        options?: IDatabaseCreateOptions<any>
    ): Promise<Entity>;

    abstract save(
        repository: Entity,
        options?: IDatabaseSaveOptions
    ): Promise<Entity>;

    abstract delete(
        repository: Entity,
        options?: IDatabaseSaveOptions
    ): Promise<Entity>;

    abstract softDelete(
        repository: Entity,
        options?: IDatabaseSaveOptions
    ): Promise<Entity>;

    abstract restore(
        repository: Entity,
        options?: IDatabaseSaveOptions
    ): Promise<Entity>;

    abstract createMany<Dto>(
        data: Dto[],
        options?: IDatabaseCreateManyOptions<any>
    ): Promise<boolean>;

    abstract deleteManyByIds(
        _id: string[],
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    abstract deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    abstract softDeleteManyByIds(
        _id: string[],
        options?: IDatabaseSoftDeleteManyOptions<any>
    ): Promise<boolean>;

    abstract softDeleteMany(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteManyOptions<any>
    ): Promise<boolean>;

    abstract restoreManyByIds(
        _id: string[],
        options?: IDatabaseRestoreManyOptions<any>
    ): Promise<boolean>;

    abstract restoreMany(
        find: Record<string, any>,
        options?: IDatabaseRestoreManyOptions<any>
    ): Promise<boolean>;

    abstract updateMany<Dto>(
        find: Record<string, any>,
        data: Dto,
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    abstract join<T = any>(
        repository: Entity,
        options: IDatabaseJoinOptions
    ): Promise<T>;

    abstract updateManyRaw(
        find: Record<string, any>,
        data: UpdateWithAggregationPipeline | UpdateQuery<any>,
        options?: IDatabaseManyOptions<any>
    ): Promise<boolean>;

    abstract raw<RawResponse, RawQuery = any>(
        rawOperation: RawQuery,
        options?: IDatabaseRawOptions
    ): Promise<RawResponse[]>;

    abstract rawFindAll<RawResponse, RawQuery = any>(
        rawOperation: RawQuery,
        options?: IDatabaseRawFindAllOptions
    ): Promise<RawResponse[]>;

    abstract rawGetTotal<RawQuery = any>(
        rawOperation: RawQuery,
        options?: IDatabaseRawGetTotalOptions
    ): Promise<number>;

    abstract model(): Promise<any>;
}
