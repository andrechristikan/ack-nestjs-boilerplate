import { PopulateOptions } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';

// find one
export interface IDatabaseFindOneOptions<T = any>
    extends Pick<IPaginationOptions, 'sort'> {
    select?: Record<string, number | string>;
    join?: boolean | PopulateOptions | PopulateOptions[];
    session?: T;
    withDeleted?: boolean;
}

export type IDatabaseOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'withDeleted' | 'join'
>;

export type IDatabaseUpdateOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'join'
>;

export type IDatabaseDeleteOptions<T = any> = IDatabaseUpdateOptions<T>;

// find
export interface IDatabaseFindAllOptions<T = any>
    extends IPaginationOptions,
        Omit<IDatabaseFindOneOptions<T>, 'sort'> {}

// create

export interface IDatabaseCreateOptions<T = any>
    extends Omit<IDatabaseOptions<T>, 'withDeleted' | 'join'> {
    _id?: string;
}

// exist

export interface IDatabaseExistOptions<T = any> extends IDatabaseOptions<T> {
    excludeId?: string[];
}

// soft delete

export type IDatabaseSoftDeleteOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'join'
>;

// restore delete

export type IDatabaseRestoreOptions<T = any> = IDatabaseSoftDeleteOptions<T>;

// bulk
export type IDatabaseManyOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'join'
>;

export type IDatabaseCreateManyOptions<T = any> = Pick<
    IDatabaseOptions<T>,
    'session'
>;

export type IDatabaseSoftDeleteManyOptions<T = any> = IDatabaseManyOptions<T>;

export type IDatabaseRestoreManyOptions<T = any> = IDatabaseManyOptions<T>;

export type IDatabaseRawOptions<T = any> = Pick<
    IDatabaseOptions<T>,
    'session' | 'withDeleted'
>;
