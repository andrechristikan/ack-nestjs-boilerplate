import { Document, SchemaTypeOptions } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { ColumnType } from 'typeorm';

export type IDatabaseSchema<T> = T | (T & Document<string>);
export interface IDatabaseConnectOptions {
    name: string;
    schema: any | IDatabaseConnectSchemaOptions;
    collection: string;
    connectionName?: string;
}

export interface IDatabaseConnectSchemaOptions {
    mongo?: any;
    postgres?: any;
}

export interface IDatabaseSchemeOptions {
    timestamps?: boolean;
    softDelete?: boolean;
    hooks?: {
        beforeSave?: () => void;
        beforeUpdate?: () => void;
        beforeCreate?: () => void;
        beforeFind?: () => void;
        beforeDelete?: () => void;
        afterSave?: () => void;
        afterUpdate?: () => void;
        afterCreate?: () => void;
        afterFind?: () => void;
        afterDelete?: () => void;
    };
}

export interface IDatabasePropOptions {
    required?: boolean;
    unique?: boolean;
    minLength?: number;
    maxLength?: number;
    default?: any;
    enum?:
        | (string | number)[]
        | Record<string, number>
        | Record<string, string>
        | Record<number, string>;
    type: SchemaTypeOptions<any> | ColumnType;

    // only for mongoose
    index?: boolean;
}

// repository
export interface IDatabaseRepositoryJoinOptions
    extends IDatabaseRepositoryDeepJoinOptions {
    deepJoin?:
        | IDatabaseRepositoryDeepJoinOptions
        | IDatabaseRepositoryDeepJoinOptions[];
}

export interface IDatabaseRepositoryDeepJoinOptions {
    field: string;
    foreignField: string;
    with: string;
}

// find one
export interface IDatabaseFindOneOptions<T = any>
    extends Pick<IPaginationOptions, 'sort'> {
    select?: Record<string, number> | Record<string, string>;
    join?: boolean;
    session?: T;
    withDeleted?: boolean;
}

export type IDatabaseOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'withDeleted' | 'join'
>;

// aggregate

export type IDatabaseAggregateOptions<T = any> = Omit<
    IDatabaseOptions<T>,
    'join'
>;

export interface IDatabaseFindAllAggregateOptions<T = any>
    extends IPaginationOptions,
        IDatabaseAggregateOptions<T> {}

export interface IDatabaseGetTotalAggregateOptions<T = any>
    extends IDatabaseOptions<T> {
    field?: Record<string, string> | string;
    sumField?: string;
}

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
export type IDatabaseManyOptions<T = any> = IDatabaseOptions<T>;

export type IDatabaseCreateManyOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session'
>;

export type IDatabaseSoftDeleteManyOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'join'
>;

export type IDatabaseRestoreManyOptions<T = any> = Pick<
    IDatabaseFindOneOptions<T>,
    'session' | 'join'
>;
