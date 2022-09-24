import { ClientSession } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';

export interface IDatabaseFindOneOptions {
    select?: Record<string, number> | Record<string, string>;
    populate?: boolean;
    session?: ClientSession;
}

export type IDatabaseFindOneAggregateOptions = Pick<
    IDatabaseFindOneOptions,
    'session'
>;

export interface IDatabaseFindAllOptions
    extends IPaginationOptions,
        IDatabaseFindOneOptions {}

export interface IDatabaseFindAllAggregateOptions
    extends IPaginationOptions,
        Pick<IDatabaseFindOneOptions, 'session'> {}

export type IDatabaseOptions = Pick<IDatabaseFindOneOptions, 'session'>;

export interface IDatabaseCreateOptions extends IDatabaseOptions {
    _id?: string;
}

export interface IDatabaseExistOptions extends IDatabaseOptions {
    excludeId?: string;
}

export interface IDatabaseGetTotalAggregateOptions extends IDatabaseOptions {
    field?: string;
}
