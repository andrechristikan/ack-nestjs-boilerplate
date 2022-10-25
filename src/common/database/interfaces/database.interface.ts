import { ClientSession, Connection, Document, Types } from 'mongoose';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { DataSource, QueryRunner } from 'typeorm';

export type DatabaseSchemaType<T> = T | (T & Document);
export type DatabaseKeyType = string | Types.ObjectId;
export interface DatabaseOptions {
    name: string;
    schema: any;
    collection: string;
    connectionName?: string;
}
export type DatabaseConnectionType = Connection | DataSource;
export type DatabaseSessionType = ClientSession | QueryRunner;

// find one
export interface IDatabaseFindOneOptions
    extends Pick<IPaginationOptions, 'sort'> {
    select?: Record<string, number> | Record<string, string>;
    populate?: boolean;
    session?: DatabaseSessionType;
    withDeleted?: boolean;
}

export type IDatabaseOptions = Pick<
    IDatabaseFindOneOptions,
    'session' | 'withDeleted' | 'populate'
>;

// aggregate

export type IDatabaseAggregateOptions = Omit<IDatabaseOptions, 'populate'>;

export interface IDatabaseFindAllAggregateOptions
    extends IPaginationOptions,
        IDatabaseAggregateOptions {}

export interface IDatabaseGetTotalAggregateOptions extends IDatabaseOptions {
    field?: Record<string, string> | string;
    sumField?: string;
}

// find
export interface IDatabaseFindAllOptions
    extends IPaginationOptions,
        Omit<IDatabaseFindOneOptions, 'sort'> {}

// create

export interface IDatabaseCreateOptions
    extends Omit<IDatabaseOptions, 'withDeleted' | 'populate'> {
    _id?: string;
}

// exist

export interface IDatabaseExistOptions extends IDatabaseOptions {
    excludeId?: string[];
}

// soft delete

export type IDatabaseSoftDeleteOptions = Pick<
    IDatabaseFindOneOptions,
    'session' | 'populate'
>;

// restore delete

export type IDatabaseRestoreOptions = IDatabaseSoftDeleteOptions;

// bulk
export type IDatabaseManyOptions = IDatabaseOptions;

export type IDatabaseCreateManyOptions = Pick<
    IDatabaseFindOneOptions,
    'session'
>;

export type IDatabaseSoftDeleteManyOptions = Pick<
    IDatabaseFindOneOptions,
    'session' | 'populate'
>;

export type IDatabaseRestoreManyOptions = Pick<
    IDatabaseFindOneOptions,
    'session' | 'populate'
>;
