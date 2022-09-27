import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
} from './database.interface';

export interface IDatabaseBulkRepositoryAbstract {
    createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;

    deleteManyById(
        _id: string[],
        options?: IDatabaseCreateOptions
    ): Promise<boolean>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseCreateOptions
    ): Promise<boolean>;

    softDeleteManyById(
        _id: string[],
        options?: IDatabaseDeleteOptions
    ): Promise<boolean>;

    softDeleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean>;

    restore(_id: string[], options?: IDatabaseRestoreOptions): Promise<boolean>;

    updateMany<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
    ): Promise<boolean>;
}
