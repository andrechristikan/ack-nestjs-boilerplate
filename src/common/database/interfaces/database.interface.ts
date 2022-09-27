import { ClientSession } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';

export interface IDatabaseFindOneOptions {
    select?: Record<string, number> | Record<string, string>;
    populate?: boolean;
    session?: ClientSession;
    withDeleted?: boolean;
}

export type IDatabaseFindOneAggregateOptions = Pick<
    IDatabaseFindOneOptions,
    'session' | 'withDeleted'
>;

export interface IDatabaseFindAllOptions
    extends IPaginationOptions,
        IDatabaseFindOneOptions {}

export interface IDatabaseFindAllAggregateOptions
    extends IPaginationOptions,
        Pick<IDatabaseFindOneOptions, 'session' | 'withDeleted'> {}

export type IDatabaseOptions = Pick<
    IDatabaseFindOneOptions,
    'session' | 'withDeleted'
>;

export type IDatabaseDeleteOptions = Pick<IDatabaseFindOneOptions, 'session'>;

export interface IDatabaseCreateOptions
    extends Omit<IDatabaseOptions, 'withDeleted'> {
    _id?: string;
}

export type IDatabaseCreateManyOptions = Omit<IDatabaseCreateOptions, '_id'>;

export interface IDatabaseExistOptions extends IDatabaseOptions {
    excludeId?: string;
}

export interface IDatabaseGetTotalAggregateOptions extends IDatabaseOptions {
    field?: string;
}

export type IDatabaseRestoreOptions = Pick<IDatabaseFindOneOptions, 'session'>;
