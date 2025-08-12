import { ENUM_DATABASE_FILTER_OPERATION_STRING_MODE } from '@common/database/constants/database.constant';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { Types } from 'mongoose';

// ============================================
// 1. BASE TYPES & COMMON INTERFACES
// ============================================

export interface IDatabaseTimestamps {
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface IDatabaseAudit {
    createdBy?: string;
    updatedBy?: string;
    deletedBy?: string;
    deleted?: boolean;
}

export interface IDatabaseBaseEntity
    extends IDatabaseTimestamps,
        IDatabaseAudit {
    _id?: Types.ObjectId;
}

export interface IDatabaseTransaction<TTransaction = unknown> {
    transaction?: TTransaction;
}

export interface IDatabaseWithDeleted {
    withDeleted?: boolean;
}

// ============================================
// 2. FILTER & QUERY INTERFACES
// ============================================

export interface IDatabaseFilterOperationComparison {
    gte?: number | string | Date;
    gt?: number | string | Date;
    lte?: number | string | Date;
    lt?: number | string | Date;
    equal?: number | string | Date | boolean;
    in?: (number | string | Date | boolean)[];
    notIn?: (number | string | Date | boolean)[];
    not?: number | string | Date | boolean;
}

export interface IDatabaseFilterOperationString {
    contains?: string;
    notContains?: string;
    startsWith?: string;
    endsWith?: string;
    regex?: string | RegExp;
    mode?: ENUM_DATABASE_FILTER_OPERATION_STRING_MODE;
}

export type IDatabaseFilterOperation = IDatabaseFilterOperationComparison &
    IDatabaseFilterOperationString;

export type IDatabaseFilterValue<TEntity> = Partial<
    Record<
        keyof TEntity,
        | IDatabaseFilterOperation
        | string
        | number
        | Date
        | boolean
        | Types.ObjectId
        | null
        | undefined
    >
>;

export interface IDatabaseFilterOperationLogical<TEntity> {
    or?: IDatabaseFilterValue<TEntity>[];
    and?: IDatabaseFilterValue<TEntity>[];
}

export type IDatabaseFilter<TEntity> = IDatabaseFilterValue<TEntity> &
    IDatabaseFilterOperationLogical<TEntity>;

// ============================================
// 3. SELECT & ORDER INTERFACES
// ============================================

export type IDatabaseSelectableFields<TEntity> = {
    [K in keyof TEntity]: TEntity[K] extends
        | IDatabaseJoinField<infer _U>
        | undefined
        ? never
        : TEntity[K] extends IDatabaseJoinField<infer _U>[]
          ? never
          : K;
}[keyof TEntity];

export type IDatabaseSelect<TEntity> = Partial<
    Record<IDatabaseSelectableFields<TEntity>, boolean>
>;

export type IDatabaseOrderDetail<TEntity> = Partial<
    Record<keyof TEntity, ENUM_PAGINATION_ORDER_DIRECTION_TYPE>
>;

export type IDatabaseOrder<TEntity> =
    | IDatabaseOrderDetail<TEntity>
    | IDatabaseOrderDetail<TEntity>[];

// ============================================
// 4. JOIN INTERFACES
// ============================================

export interface IDatabaseJoinProps {
    fromEntity: string;
    localField: string;
    fromField?: string;
}

export interface IDatabaseJoinOn {
    localField: string;
    foreignField: string;
}

export type IDatabaseJoinField<T> = T & { isJoined: true };

export type IDatabaseExtractJoinedFields<TEntity> = {
    [K in keyof TEntity]: TEntity[K] extends
        | IDatabaseJoinField<infer U>
        | undefined
        ? U extends object
            ? K
            : never
        : TEntity[K] extends IDatabaseJoinField<infer U>[]
          ? U extends object
              ? K
              : never
          : never;
}[keyof TEntity];

export type IDatabaseExtractJoinedEntity<T> = T extends
    | IDatabaseJoinField<infer U>
    | undefined
    ? U
    : T extends IDatabaseJoinField<infer U>[]
      ? U
      : never;

export type IDatabaseJoinDetailSingle<TFromEntity = unknown> =
    IDatabaseExtractJoinedFields<TFromEntity> extends never
        ? {
              select?: IDatabaseSelect<TFromEntity>;
              where?: IDatabaseFilter<TFromEntity>;
          }
        : {
              select?: IDatabaseSelect<TFromEntity>;
              where?: IDatabaseFilter<TFromEntity>;
              join?: IDatabaseJoin<TFromEntity>;
          };

export type IDatabaseJoinDetailArray<TFromEntity = unknown> =
    IDatabaseExtractJoinedFields<TFromEntity> extends never
        ? {
              select?: IDatabaseSelect<TFromEntity>;
              where?: IDatabaseFilter<TFromEntity>;
              limit?: number;
              skip?: number;
          }
        : {
              select?: IDatabaseSelect<TFromEntity>;
              where?: IDatabaseFilter<TFromEntity>;
              limit?: number;
              skip?: number;
              join?: IDatabaseJoin<TFromEntity>;
          };

export type IDatabaseJoinDetail<TFromEntity = unknown> =
    IDatabaseExtractJoinedFields<TFromEntity> extends never
        ? {
              select?: IDatabaseSelect<TFromEntity>;
              where?: IDatabaseFilter<TFromEntity>;
              limit?: number;
              skip?: number;
          }
        : {
              select?: IDatabaseSelect<TFromEntity>;
              where?: IDatabaseFilter<TFromEntity>;
              limit?: number;
              skip?: number;
              join?: IDatabaseJoin<TFromEntity>;
          };

export type IDatabaseJoinConfig<_TEntity, TField> =
    TField extends IDatabaseJoinField<infer U>[]
        ? IDatabaseJoinDetailArray<U> | boolean
        : TField extends IDatabaseJoinField<infer U> | undefined
          ? IDatabaseJoinDetailSingle<U> | boolean
          : never;

export type IDatabaseJoin<TEntity = unknown> =
    IDatabaseExtractJoinedFields<TEntity> extends never
        ? Record<string, never>
        : {
              [K in IDatabaseExtractJoinedFields<TEntity>]?: IDatabaseJoinConfig<
                  TEntity,
                  TEntity[K]
              >;
          };

export type IDatabaseResolveJoinedEntity<
    TEntity,
    TJoin extends IDatabaseJoin | undefined,
> = TJoin extends undefined
    ? TEntity
    : {
          [K in keyof TEntity]: K extends keyof TJoin
              ? TEntity[K] extends IDatabaseJoinField<infer U> | undefined
                  ? TJoin[K] extends true
                      ? U
                      : TJoin[K] extends IDatabaseJoinDetail
                        ? TJoin[K] extends { limit: number }
                            ? TJoin[K] extends { join: IDatabaseJoin }
                                ? IDatabaseExtractJoinedFields<U> extends never
                                    ? U[]
                                    : IDatabaseResolveJoinedEntity<
                                          U,
                                          TJoin[K]['join']
                                      >[]
                                : U[]
                            : TJoin[K] extends { join: IDatabaseJoin }
                              ? IDatabaseExtractJoinedFields<U> extends never
                                  ? U
                                  : IDatabaseResolveJoinedEntity<
                                        U,
                                        TJoin[K]['join']
                                    >
                              : U
                        : TEntity[K]
                  : TEntity[K] extends IDatabaseJoinField<infer U>[]
                    ? TJoin[K] extends true
                        ? U[]
                        : TJoin[K] extends IDatabaseJoinDetail
                          ? TJoin[K] extends { limit: number }
                              ? TJoin[K] extends { join: IDatabaseJoin }
                                  ? IDatabaseExtractJoinedFields<U> extends never
                                      ? U[]
                                      : IDatabaseResolveJoinedEntity<
                                            U,
                                            TJoin[K]['join']
                                        >[]
                                  : U[]
                              : TJoin[K] extends { join: IDatabaseJoin }
                                ? IDatabaseExtractJoinedFields<U> extends never
                                    ? U[]
                                    : IDatabaseResolveJoinedEntity<
                                          U,
                                          TJoin[K]['join']
                                      >[]
                                : U[]
                          : TEntity[K]
                    : TEntity[K]
              : TEntity[K];
      };

// ============================================
// 5. PAGINATION INTERFACES
// ============================================

export interface IDatabasePaginationOptions {
    limit: number;
    skip: number;
}

export interface IDatabasePaginationReturn<TEntity> {
    items: TEntity[];
    count: number;
    page: number;
    totalPage: number;
}

// ============================================
// 6. QUERY OPERATION INTERFACES
// ============================================

export interface IDatabaseQueryOptions<TEntity, TTransaction>
    extends IDatabaseTransaction<TTransaction>,
        IDatabaseWithDeleted {
    where?: IDatabaseFilter<TEntity>;
    select?: IDatabaseSelect<TEntity>;
    order?: IDatabaseOrder<TEntity>;
    join?: IDatabaseJoin<TEntity>;
    transaction?: TTransaction;
}

export interface IDatabaseFindManyWithPagination<TEntity, TTransaction>
    extends IDatabaseQueryOptions<TEntity, TTransaction>,
        IDatabasePaginationOptions {}

export type IDatabaseFindMany<TEntity, TTransaction> = Partial<
    IDatabaseFindManyWithPagination<TEntity, TTransaction>
>;

export interface IDatabaseFindOne<TEntity, TTransaction>
    extends Pick<
        IDatabaseQueryOptions<TEntity, TTransaction>,
        'select' | 'join' | 'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
}

export interface IDatabaseFindOneById<TTransaction>
    extends Pick<
        IDatabaseQueryOptions<unknown, TTransaction>,
        'select' | 'join' | 'withDeleted' | 'transaction'
    > {
    where: { _id: Types.ObjectId };
}

export type IDatabaseCount<TEntity, TTransaction> = Pick<
    IDatabaseQueryOptions<TEntity, TTransaction>,
    'where' | 'withDeleted' | 'transaction'
>;

export type IDatabaseExist<TEntity, TTransaction> = IDatabaseCount<
    TEntity,
    TTransaction
>;

// ============================================
// 7. MUTATION OPERATION INTERFACES
// ============================================

export type IDatabaseUpdateAtomic =
    | { increment?: number }
    | { decrement?: number }
    | { multiply?: number }
    | { divide?: number };

export interface IDatabaseCreate<TEntity, TTransaction>
    extends Pick<IDatabaseQueryOptions<TEntity, TTransaction>, 'transaction'> {
    data: Omit<
        TEntity,
        | '_id'
        | 'createdAt'
        | 'createdBy'
        | 'updatedAt'
        | 'updatedBy'
        | 'deletedAt'
        | 'deletedBy'
        | 'deleted'
    > & {
        _id?: Types.ObjectId;
        createdAt?: Date;
        createdBy?: string;
    };
}

export interface IDatabaseCreateMany<TEntity, TTransaction>
    extends Pick<IDatabaseQueryOptions<TEntity, TTransaction>, 'transaction'> {
    data: IDatabaseCreate<TEntity, TTransaction>['data'][];
}

export interface IDatabaseUpdate<TEntity, TTransaction>
    extends Pick<
        IDatabaseQueryOptions<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
    data:
        | Partial<
              Omit<
                  TEntity,
                  | '_id'
                  | 'createdAt'
                  | 'createdBy'
                  | 'deletedAt'
                  | 'deletedBy'
                  | 'deleted'
              >
          >
        | Record<keyof TEntity, IDatabaseUpdateAtomic>;
}

export interface IDatabaseUpdateMany<TEntity, TTransaction>
    extends Pick<
        IDatabaseQueryOptions<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
    data: IDatabaseUpdate<TEntity, TTransaction>['data'];
}

export interface IDatabaseUpsert<TEntity, TTransaction>
    extends Omit<IDatabaseUpdate<TEntity, TTransaction>, 'data'> {
    update: IDatabaseUpdate<TEntity, TTransaction>['data'];
    create: IDatabaseCreate<TEntity, TTransaction>['data'];
}

// ============================================
// 8. DELETE OPERATION INTERFACES
// ============================================

export interface IDatabaseDelete<TEntity, TTransaction>
    extends Pick<
        IDatabaseQueryOptions<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
}

export type IDatabaseDeleteMany<TEntity, TTransaction> = IDatabaseDelete<
    TEntity,
    TTransaction
>;

export interface IDatabaseSoftDelete<TEntity, TTransaction>
    extends Omit<IDatabaseDelete<TEntity, TTransaction>, 'withDeleted'> {
    data?: {
        deletedAt?: Date;
        deletedBy?: string;
    };
}

export type IDatabaseSoftDeleteMany<TEntity, TTransaction> =
    IDatabaseSoftDelete<TEntity, TTransaction>;

export interface IDatabaseRestore<TEntity, TTransaction>
    extends Omit<IDatabaseSoftDelete<TEntity, TTransaction>, 'data'> {
    data?: {
        restoreBy?: string;
    };
}

export type IDatabaseRestoreMany<TEntity, TTransaction> = IDatabaseRestore<
    TEntity,
    TTransaction
>;

// ============================================
// 9. RAW QUERY & RETURN INTERFACES
// ============================================

export interface IDatabaseRaw<TRaw, TTransaction>
    extends Pick<IDatabaseQueryOptions<unknown, TTransaction>, 'transaction'> {
    raw: TRaw;
}

export interface IDatabaseManyReturn {
    count: number;
    ids?: Types.ObjectId[];
}

export interface IDatabaseExistReturn {
    _id: Types.ObjectId;
}
