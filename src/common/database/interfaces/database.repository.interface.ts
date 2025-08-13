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

    findMany<TSelect extends IDatabaseSelect<TEntity> | undefined = undefined>(
        queries?: IDatabaseFindMany<TEntity, TTransaction>
    ): Promise<IDatabaseReturn<TEntity, TSelect>[]>;
    findManyWithPagination<
        TSelect extends IDatabaseSelect<TEntity> | undefined = undefined,
    >(
        queries: IDatabaseFindManyWithPagination<TEntity, TTransaction>
    ): Promise<IDatabasePaginationReturn<IDatabaseReturn<TEntity, TSelect>>>;
    findOne<TSelect extends IDatabaseSelect<TEntity> | undefined = undefined>(
        queries: IDatabaseFindOne<TEntity, TTransaction> & { select?: TSelect }
    ): Promise<IDatabaseReturn<TEntity, TSelect> | null>;
    findOneById<
        TSelect extends IDatabaseSelect<TEntity> | undefined = undefined,
    >(params: {
        queries: IDatabaseFindOneById<TTransaction>;
    }): Promise<IDatabaseReturn<TEntity, TSelect> | null>;
    count(params?: {
        queries?: IDatabaseCount<TEntity, TTransaction>;
    }): Promise<number>;
    create(params: {
        queries: IDatabaseCreate<TEntity, TTransaction>;
    }): Promise<TEntity>;
    update(params: {
        queries: IDatabaseUpdate<TEntity, TTransaction>;
    }): Promise<TEntity>;
    delete(params: {
        queries: IDatabaseDelete<TEntity, TTransaction>;
    }): Promise<TEntity>;
    exists(params: {
        queries: IDatabaseExist<TEntity, TTransaction>;
    }): Promise<IDatabaseExistReturn | null>;
    upsert(params: {
        queries: IDatabaseUpsert<TEntity, TTransaction>;
    }): Promise<TEntity>;
    raw<T>(params: IDatabaseRaw<TRaw, TTransaction>): Promise<T>;
    createMany(params: {
        queries: IDatabaseCreateMany<TEntity, TTransaction>;
    }): Promise<IDatabaseManyReturn>;
    updateMany(params: {
        queries: IDatabaseUpdateMany<TEntity, TTransaction>;
    }): Promise<IDatabaseManyReturn>;
    deleteMany(params: {
        queries: IDatabaseDeleteMany<TEntity, TTransaction>;
    }): Promise<IDatabaseManyReturn>;
    softDelete(params: {
        queries: IDatabaseSoftDelete<TEntity, TTransaction>;
    }): Promise<TEntity>;
    restore(params: {
        queries: IDatabaseRestore<TEntity, TTransaction>;
    }): Promise<TEntity>;
    softDeleteMany(params: {
        queries: IDatabaseSoftDeleteMany<TEntity, TTransaction>;
    }): Promise<IDatabaseManyReturn>;
    restoreMany(params: {
        queries: IDatabaseRestoreMany<TEntity, TTransaction>;
    }): Promise<IDatabaseManyReturn>;
    withTransaction<T = void>(params: {
        callback: (session: TTransaction) => Promise<T>;
    }): Promise<T>;
    createTransaction(): Promise<TTransaction>;
    commitTransaction(params: { session: TTransaction }): Promise<void>;
    abortTransaction(params: { session: TTransaction }): Promise<void>;
}
