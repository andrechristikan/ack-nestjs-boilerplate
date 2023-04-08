import { PopulateOptions } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';

// find one
export interface IDatabaseFindOneOptions<T = any>
    extends Pick<IPaginationOptions, 'order'> {
    select?: Record<string, boolean | number>;
    join?: boolean | PopulateOptions | PopulateOptions[];
    session?: T;
    withDeleted?: boolean;
}

export type IDatabaseGetTotalOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'withDeleted' | 'join'
>;

export type IDatabaseSaveOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session'
>;

// find
export interface IDatabaseFindAllOptions<T = any>
    extends IPaginationOptions,
        Omit<IDatabaseFindOneOptions<T>, 'order'> {}

// create

export interface IDatabaseCreateOptions<T = any>
    extends Pick<IDatabaseFindOneOptions<T>, 'session'> {
    _id?: string;
}

// exist

export interface IDatabaseExistOptions<T = any>
    extends Pick<
        IDatabaseFindOneOptions<T>,
        'session' | 'withDeleted' | 'join'
    > {
    excludeId?: string[];
}

// bulk
export type IDatabaseManyOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'join'
>;

export type IDatabaseCreateManyOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session'
>;

export type IDatabaseSoftDeleteManyOptions<T = any> = IDatabaseManyOptions<T>;

export type IDatabaseRestoreManyOptions<T = any> = IDatabaseManyOptions<T>;

export type IDatabaseRawOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'withDeleted'
>;
