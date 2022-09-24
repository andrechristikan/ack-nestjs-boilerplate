import { PipelineStage } from 'mongoose';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneAggregateOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalAggregateOptions,
    IDatabaseOptions,
} from './database.interface';

export interface IDatabaseRepositoryAbstract<T> {
    findAll<Y = T>(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<Y[]>;

    findAllAggregate<Y = T>(
        pipeline: PipelineStage[],
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<Y[]>;

    findOne<Y = T>(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<Y>;

    findOneById<Y = T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<Y>;

    findOneAggregate<Y = T>(
        pipeline: PipelineStage[],
        options?: IDatabaseFindOneAggregateOptions
    ): Promise<Y[]>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<number>;

    getTotalAggregate(
        pipeline: PipelineStage[],
        options?: IDatabaseGetTotalAggregateOptions
    ): Promise<number>;

    aggregate<N>(
        pipeline: Record<string, any>[],
        options?: IDatabaseOptions
    ): Promise<N[]>;

    exists(
        find: Record<string, any>,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;

    create<N>(data: N, options?: IDatabaseCreateOptions): Promise<T>;

    updateOne<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
    ): Promise<T>;

    updateOneById<N>(
        _id: string,
        data: N,
        options?: IDatabaseOptions
    ): Promise<T>;

    deleteOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<T>;

    deleteOneById(_id: string, options?: IDatabaseOptions): Promise<T>;
}
