import { IDatabaseOptions } from './database.interface';

export interface IDatabaseBulkRepositoryAbstract {
    createMany<N>(data: N[], options?: IDatabaseOptions): Promise<boolean>;

    deleteManyById(_id: string[], options?: IDatabaseOptions): Promise<boolean>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<boolean>;

    updateMany<N>(
        find: Record<string, any>,
        data: N,
        options?: IDatabaseOptions
    ): Promise<boolean>;
}
