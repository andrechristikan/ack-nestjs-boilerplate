import {
    IDatabaseCount,
    IDatabaseCreate,
    IDatabaseCreateMany,
    IDatabaseDelete,
    IDatabaseDeleteMany,
    IDatabaseExist,
    IDatabaseExistReturn,
    IDatabaseFindMany,
    IDatabaseFindManyWithPagination,
    IDatabaseFindOne,
    IDatabaseFindOneById,
    IDatabaseManyReturn,
    IDatabasePaginationReturn,
    IDatabaseRaw,
    IDatabaseRestore,
    IDatabaseRestoreMany,
    IDatabaseSoftDelete,
    IDatabaseSoftDeleteMany,
    IDatabaseUpdate,
    IDatabaseUpdateMany,
    IDatabaseUpsert,
} from '@common/database/interfaces/database.interface';

export interface IDatabaseRepository<TEntity, TModel, TRaw, TTransaction> {
    _model: TModel;

    findMany<T = TEntity>(
        queries?: IDatabaseFindMany<TEntity, TTransaction>
    ): Promise<T[]>;
    findManyWithPagination<T = TEntity>(
        queries: IDatabaseFindManyWithPagination<TEntity, TTransaction>
    ): Promise<IDatabasePaginationReturn<T>>;
    findOne<T = TEntity>(
        queries: IDatabaseFindOne<TEntity, TTransaction>
    ): Promise<T | null>;
    findOneById<T = TEntity>(
        queries: IDatabaseFindOneById<TTransaction>
    ): Promise<T | null>;
    count(queries?: IDatabaseCount<TEntity, TTransaction>): Promise<number>;
    create(queries: IDatabaseCreate<TEntity, TTransaction>): Promise<TEntity>;
    update(queries: IDatabaseUpdate<TEntity, TTransaction>): Promise<TEntity>;
    delete(queries: IDatabaseDelete<TEntity, TTransaction>): Promise<TEntity>;
    exists(
        queries: IDatabaseExist<TEntity, TTransaction>
    ): Promise<IDatabaseExistReturn | null>;
    upsert(queries: IDatabaseUpsert<TEntity, TTransaction>): Promise<TEntity>;
    raw<T>({ raw, transaction }: IDatabaseRaw<TRaw, TTransaction>): Promise<T>;
    createMany(
        queries: IDatabaseCreateMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;
    updateMany(
        queries: IDatabaseUpdateMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;
    deleteMany(
        queries: IDatabaseDeleteMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;
    softDelete(
        queries: IDatabaseSoftDelete<TEntity, TTransaction>
    ): Promise<TEntity>;
    restore(queries: IDatabaseRestore<TEntity, TTransaction>): Promise<TEntity>;
    softDeleteMany(
        queries: IDatabaseSoftDeleteMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;
    restoreMany(
        queries: IDatabaseRestoreMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;
    withTransaction<T = void>(
        callback: (session: TTransaction) => Promise<T>
    ): Promise<T>;
    createTransaction(): Promise<TTransaction>;
    commitTransaction(session: TTransaction): Promise<void>;
    abortTransaction(session: TTransaction): Promise<void>;
}
