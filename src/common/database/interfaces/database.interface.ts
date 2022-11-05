import { ModuleMetadata, Type } from '@nestjs/common';
import { PopulateOptions } from 'mongoose';
import { ENUM_DATABASE_TYPE } from 'src/common/database/constants/database.enum';
import { IPaginationOptions } from 'src/common/pagination/interfaces/pagination.interface';
import { FindOptionsRelations } from 'typeorm';

export interface IDatabaseRepositoryModuleOptions {
    type: ENUM_DATABASE_TYPE;
    name: string;
    databaseName: string;
    entity: {
        mongo?: any;
        postgres?: any;
    };
}

export interface IDatabaseRepositoryModuleOptionsFactory {
    createMassiveConnectOptions():
        | Promise<IDatabaseRepositoryModuleOptions>
        | IDatabaseRepositoryModuleOptions;
}

export interface IDatabaseRepositoryAsyncModuleOptions
    extends Pick<ModuleMetadata, 'imports'> {
    name: string;
    inject?: any[];
    useExisting?: Type<IDatabaseRepositoryModuleOptionsFactory>;
    useClass?: Type<IDatabaseRepositoryModuleOptionsFactory>;
    useFactory?: (
        ...args: any[]
    ) =>
        | Promise<IDatabaseRepositoryModuleOptions>
        | IDatabaseRepositoryModuleOptions;
}

// find one
export interface IDatabaseFindOneOptions<T = any>
    extends Pick<IPaginationOptions, 'sort'> {
    select?: Record<string, number | string>;
    join?:
        | boolean
        | FindOptionsRelations<T>
        | PopulateOptions
        | PopulateOptions[];
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

// Raw

export type IDatabaseRawOptions<T = any> = Pick<IDatabaseOptions<T>, 'session'>;

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

export type IDatabaseCreateManyOptions<T = any> = IDatabaseRawOptions<T>;

export type IDatabaseSoftDeleteManyOptions<T = any> = IDatabaseManyOptions<T>;

export type IDatabaseRestoreManyOptions<T = any> = IDatabaseManyOptions<T>;
