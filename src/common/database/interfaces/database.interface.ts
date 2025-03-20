import { ClientSession, Document, PopulateOptions } from 'mongoose';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';

export interface IDatabaseQueryContainOptions {
    fullWord: boolean;
}

export type IDatabaseDocument<T> = T & Document;

// Find
export interface IDatabaseOptions {
    select?: Record<string, boolean | number> | string;
    join?: boolean | PopulateOptions | PopulateOptions[];
    session?: ClientSession;
    withDeleted?: boolean;
}

export interface IDatabaseExistsOptions extends IDatabaseOptions {
    excludeId?: string;
}

export interface IDatabaseFindOneOptions extends IDatabaseOptions {
    order?: IPaginationOrder;
}

export type IDatabaseGetTotalOptions = Omit<IDatabaseOptions, 'select'>;

export interface IDatabaseFindAllPagingOptions {
    limit: number;
    offset: number;
}

export interface IDatabaseFindAllOptions extends IDatabaseFindOneOptions {
    paging?: IDatabaseFindAllPagingOptions;
}

// Action
export type IDatabaseCreateOptions = Pick<IDatabaseOptions, 'session'>;
export type IDatabaseUpdateOptions = Omit<IDatabaseOptions, 'select' | 'join'>;
export type IDatabaseDeleteOptions = Omit<IDatabaseOptions, 'select' | 'join'>;
export type IDatabaseSaveOptions = Pick<IDatabaseOptions, 'session'>;

// Bulk
export type IDatabaseCreateManyOptions = Pick<IDatabaseOptions, 'session'>;
export interface IDatabaseUpdateManyOptions
    extends Pick<IDatabaseOptions, 'session' | 'withDeleted'> {
    upsert?: boolean;
}
export type IDatabaseDeleteManyOptions = Pick<
    IDatabaseOptions,
    'session' | 'withDeleted'
>;

// Raw
export type IDatabaseAggregateOptions = Pick<
    IDatabaseOptions,
    'session' | 'withDeleted'
>;
export type IDatabaseFindAllAggregateOptions = Omit<
    IDatabaseFindAllOptions,
    'join' | 'select'
>;
