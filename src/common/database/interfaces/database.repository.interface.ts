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
    IDatabaseReturn,
    IDatabaseSelect,
    IDatabaseSoftDelete,
    IDatabaseSoftDeleteMany,
    IDatabaseUpdate,
    IDatabaseUpdateMany,
    IDatabaseUpsert,
} from '@common/database/interfaces/database.interface';

export interface IDatabaseRepository<TEntity, TModel, TRaw, TTransaction> {
    _model: TModel;

    findMany<
        TSelect extends
            | IDatabaseSelect<TEntity>
            | undefined = IDatabaseSelect<TEntity>,
    >(
        queries?: IDatabaseFindMany<TEntity, TSelect, TTransaction>
    ): Promise<IDatabaseReturn<TEntity, TSelect>[]>;

    findManyWithPagination<
        TSelect extends
            | IDatabaseSelect<TEntity>
            | undefined = IDatabaseSelect<TEntity>,
    >(
        queries: IDatabaseFindManyWithPagination<TEntity, TSelect, TTransaction>
    ): Promise<IDatabasePaginationReturn<TEntity, TSelect>>;

    findOne<
        TSelect extends
            | IDatabaseSelect<TEntity>
            | undefined = IDatabaseSelect<TEntity>,
    >(
        queries: IDatabaseFindOne<TEntity, TSelect, TTransaction>
    ): Promise<IDatabaseReturn<TEntity, TSelect> | null>;

    findOneById<
        TSelect extends
            | IDatabaseSelect<TEntity>
            | undefined = IDatabaseSelect<TEntity>,
    >(
        queries: IDatabaseFindOneById<TEntity, TSelect, TTransaction>
    ): Promise<IDatabaseReturn<TEntity, TSelect> | null>;

    count(queries?: IDatabaseCount<TEntity, TTransaction>): Promise<number>;

    exists(
        queries: IDatabaseExist<TEntity, TTransaction>
    ): Promise<IDatabaseExistReturn | null>;

    create(queries: IDatabaseCreate<TEntity, TTransaction>): Promise<TEntity>;

    createMany(
        queries: IDatabaseCreateMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;

    update(queries: IDatabaseUpdate<TEntity, TTransaction>): Promise<TEntity>;

    updateMany(
        queries: IDatabaseUpdateMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;

    upsert(queries: IDatabaseUpsert<TEntity, TTransaction>): Promise<TEntity>;

    delete(queries: IDatabaseDelete<TEntity, TTransaction>): Promise<TEntity>;

    deleteMany(
        queries: IDatabaseDeleteMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;

    softDelete(
        queries: IDatabaseSoftDelete<TEntity, TTransaction>
    ): Promise<TEntity>;

    softDeleteMany(
        queries: IDatabaseSoftDeleteMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;

    restore(queries: IDatabaseRestore<TEntity, TTransaction>): Promise<TEntity>;

    restoreMany(
        queries: IDatabaseRestoreMany<TEntity, TTransaction>
    ): Promise<IDatabaseManyReturn>;

    raw<T>(queries: IDatabaseRaw<TRaw, TTransaction>): Promise<T>;

    withTransaction<T = void>(
        callback: (session: TTransaction) => Promise<T>
    ): Promise<T>;

    createTransaction(): Promise<TTransaction>;

    commitTransaction(session: TTransaction): Promise<void>;

    abortTransaction(session: TTransaction): Promise<void>;
}
