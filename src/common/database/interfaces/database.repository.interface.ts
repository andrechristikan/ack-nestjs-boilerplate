import { PipelineStage } from 'mongoose';
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
} from './database.interface';

export interface IDatabaseRepositoryAbstract<T> {
    findAll<Y = T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<Y[]>;

    findAllAggregate<N>(
        pipeline: PipelineStage[],
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<N[]>;

    findOne<Y = T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<Y>;

    findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Y>;

    findOneAggregate<N>(
        pipeline: PipelineStage[],
        options?: IDatabaseAggregateOptions
    ): Promise<N[]>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    getTotalAggregate(
        pipeline: PipelineStage[],
        options?: IDatabaseGetTotalAggregateOptions
    ): Promise<number>;

    exists(
        find: Record<string, any>,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    aggregate<N>(
        pipeline: Record<string, any>[],
        options?: IDatabaseAggregateOptions
    ): Promise<N[]>;

    create<N>(data: N, options?: IDatabaseCreateOptions): Promise<T>;

    updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseOptions
    ): Promise<T>;

    updateOne<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
    ): Promise<T>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<T>;

    deleteOneById(_id: string, options?: IDatabaseOptions): Promise<T>;

    softDeleteOneById(
        _id: string,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<T>;

    softDeleteOne(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<T>;

    restore(_id: string, options?: IDatabaseRestoreOptions): Promise<T>;
}
