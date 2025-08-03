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
    IDatabasePagination,
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

    findMany(
        queries?: IDatabaseFindMany<TEntity, TTransaction>
    ): Promise<Partial<TEntity>[]>;
    findManyWithPagination(
        queries: IDatabaseFindManyWithPagination<TEntity, TTransaction>
    ): Promise<IDatabasePagination<Partial<TEntity>>>;
    findOne(
        queries: IDatabaseFindOne<TEntity, TTransaction>
    ): Promise<Partial<TEntity> | null>;
    findOneById(
        queries: IDatabaseFindOneById<TTransaction>
    ): Promise<Partial<TEntity> | null>;
    count(queries?: IDatabaseCount<TEntity, TTransaction>): Promise<number>;
    create(
        queries: IDatabaseCreate<TEntity, TTransaction>
    ): Promise<Partial<TEntity>>;
    update(
        queries: IDatabaseUpdate<TEntity, TTransaction>
    ): Promise<Partial<TEntity>>;
    delete(
        queries: IDatabaseDelete<TEntity, TTransaction>
    ): Promise<Partial<TEntity>>;
    exists(
        queries: IDatabaseExist<TEntity, TTransaction>
    ): Promise<IDatabaseExistReturn>;
    upsert(
        queries: IDatabaseUpsert<TEntity, TTransaction>
    ): Promise<Partial<TEntity>>;
    raw({
        raw,
        transaction,
    }: IDatabaseRaw<TRaw, TTransaction>): Promise<Partial<TEntity>>;
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
    ): Promise<Partial<TEntity>>;
    restore(
        queries: IDatabaseRestore<TEntity, TTransaction>
    ): Promise<Partial<TEntity>>;
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
