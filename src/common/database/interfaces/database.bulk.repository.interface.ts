import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseOptions,
    IDatabaseRestoreOptions,
} from './database.interface';

export interface IDatabaseBulkRepositoryAbstract {
    createMany<N>(
        data: N[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;

    deleteManyById(_id: string[], options?: IDatabaseOptions): Promise<boolean>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<boolean>;

    softDeleteManyById(
        _id: string[],
        options?: IDatabaseSoftDeleteOptions
    ): Promise<boolean>;

    softDeleteMany(
        find: Record<string, any>,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<boolean>;

    restore(_id: string[], options?: IDatabaseRestoreOptions): Promise<boolean>;

    updateMany<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
    ): Promise<boolean>;
}
