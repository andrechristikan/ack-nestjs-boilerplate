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

type IDatabaseSelectNested<TEntity> = {
    [K in keyof TEntity]?: TEntity[K] extends
        | IDatabaseJoinField<infer U>
        | undefined
        ? IDatabaseSelectNested<U> | boolean
        : TEntity[K] extends IDatabaseJoinField<infer U>[]
          ? IDatabaseSelectNested<U> | boolean
          : boolean;
};

export type IDatabaseSelect<TEntity> = IDatabaseSelectNested<TEntity>;

export type IDatabaseOrderDetail<TEntity> = Partial<
    Record<keyof TEntity, ENUM_PAGINATION_ORDER_DIRECTION_TYPE>
>;

export type IDatabaseOrder<TEntity> =
    | IDatabaseOrderDetail<TEntity>
    | IDatabaseOrderDetail<TEntity>[];

// ============================================
// 3.1. SELECT RESULT INTERFACES
// ============================================
type IDatabaseReturnIsSelected<T> = T extends true
    ? true
    : T extends Record<string, unknown>
      ? true
      : false;

type IDatabaseReturnSelectedKeys<TSelect> = {
    [K in keyof TSelect]: IDatabaseReturnIsSelected<TSelect[K]> extends true
        ? K
        : never;
}[keyof TSelect];

export type IDatabaseReturnSelectedFields<TEntity, TSelect> =
    TSelect extends Record<string, unknown>
        ? {
              [K in IDatabaseReturnSelectedKeys<TSelect> &
                  keyof TEntity]: K extends keyof TSelect
                  ? TSelect[K] extends true
                      ? TEntity[K]
                      : TSelect[K] extends Record<string, unknown>
                        ? TEntity[K] extends
                              | IDatabaseJoinField<infer U>
                              | undefined
                            ?
                                  | IDatabaseReturnSelectedFields<U, TSelect[K]>
                                  | undefined
                            : TEntity[K] extends IDatabaseJoinField<infer U>[]
                              ? IDatabaseReturnSelectedFields<U, TSelect[K]>[]
                              : TEntity[K]
                        : TEntity[K]
                  : never;
          }
        : TEntity;

export type IDatabaseReturn<TEntity, TSelect = undefined> = TSelect extends
    | undefined
    | null
    ? TEntity
    : TSelect extends Record<string, unknown>
      ? IDatabaseReturnSelectedFields<TEntity, TSelect>
      : TEntity;

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
        ? boolean
        : {
              join?: IDatabaseJoin<TFromEntity>;
          };

export type IDatabaseJoinDetailArray<TFromEntity = unknown> =
    IDatabaseExtractJoinedFields<TFromEntity> extends never
        ? {
              where?: IDatabaseFilter<TFromEntity>;
              limit?: number;
              skip?: number;
          }
        : {
              where?: IDatabaseFilter<TFromEntity>;
              limit?: number;
              skip?: number;
              join?: IDatabaseJoin<TFromEntity>;
          };

export type IDatabaseJoinDetail<TFromEntity = unknown> =
    IDatabaseExtractJoinedFields<TFromEntity> extends never
        ? {
              where?: IDatabaseFilter<TFromEntity>;
              limit?: number;
              skip?: number;
          }
        : {
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

// ============================================
// 5. PAGINATION INTERFACES
// ============================================

export interface IDatabasePaginationOptions {
    limit: number;
    skip: number;
}

export interface IDatabasePaginationReturn<
    TEntity,
    TSelect = IDatabaseSelect<TEntity>,
> {
    items: IDatabaseReturn<TEntity, TSelect>[];
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

export interface IDatabaseFindManyWithPagination<
    TEntity,
    TSelect extends
        | IDatabaseSelect<TEntity>
        | undefined = IDatabaseSelect<TEntity>,
    TTransaction = unknown,
> extends IDatabasePaginationOptions {
    where?: IDatabaseFilter<TEntity>;
    select?: TSelect;
    order?: IDatabaseOrder<TEntity>;
    join?: IDatabaseJoin<TEntity>;
    withDeleted?: boolean;
    transaction?: TTransaction;
}

export type IDatabaseFindMany<
    TEntity,
    TSelect extends
        | IDatabaseSelect<TEntity>
        | undefined = IDatabaseSelect<TEntity>,
    TTransaction = unknown,
> = Partial<
    Omit<
        IDatabaseFindManyWithPagination<TEntity, TSelect, TTransaction>,
        'limit' | 'skip'
    >
>;

export interface IDatabaseFindOne<
    TEntity,
    TSelect extends
        | IDatabaseSelect<TEntity>
        | undefined = IDatabaseSelect<TEntity>,
    TTransaction = unknown,
> {
    where: IDatabaseFilter<TEntity>;
    select?: TSelect;
    join?: IDatabaseJoin<TEntity>;
    withDeleted?: boolean;
    transaction?: TTransaction;
}

export interface IDatabaseFindOneById<
    TEntity,
    TSelect extends
        | IDatabaseSelect<TEntity>
        | undefined = IDatabaseSelect<TEntity>,
    TTransaction = unknown,
> {
    where: { _id: Types.ObjectId };
    select?: TSelect;
    join?: IDatabaseJoin<TEntity>;
    withDeleted?: boolean;
    transaction?: TTransaction;
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
