import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { Types } from 'mongoose';

export interface IDatabaseJoin {
    [key: string]: boolean | Record<string, boolean>;
}

export interface IDatabaseOrder {
    [key: string]: ENUM_PAGINATION_ORDER_DIRECTION_TYPE;
}

export interface IDatabaseFilterOperationComparison {
    gte?: number | string | Date;
    gt?: number | string | Date;
    lte?: number | string | Date;
    lt?: number | string | Date;
    equal?: number | string | Date | boolean;
    in?: (number | string | Date | boolean)[];
    notIn?: (number | string | Date | boolean)[];
    notEqual?: number | string | Date | boolean;
}

export interface IDatabaseFilterOperationString {
    contains?: string;
    notContains?: string;
    startsWith?: string;
    endsWith?: string;
}

export interface IDatabaseFilterOperationLogical {
    or?: (IDatabaseFilterOperationComparison &
        IDatabaseFilterOperationString)[];
    and?: (IDatabaseFilterOperationComparison &
        IDatabaseFilterOperationString)[];
}

export type IDatabaseFilterOperation = IDatabaseFilterOperationComparison &
    IDatabaseFilterOperationString &
    IDatabaseFilterOperationLogical;

export type IDatabaseFilter<TEntity> = Partial<
    Record<
        keyof TEntity,
        | IDatabaseFilterOperation
        | string
        | number
        | Date
        | boolean
        | null
        | undefined
    > & { id?: string }
>;

export type IDatabaseUpdateAtomic =
    | {
          increment?: number;
      }
    | {
          decrement?: number;
      }
    | {
          multiply?: number;
      }
    | {
          divide?: number;
      };

export interface IDatabasePagination<TEntity> {
    items: Partial<TEntity>[];
    count: number;
    page: number;
    totalPage: number;
    limit: number;
    skip: number;
}

export interface IDatabaseBaseEntity {
    id: string;
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    deleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
}

export interface IDatabaseManyReturn {
    count: number;
    ids?: string[];
}

export interface IDatabaseExistReturn {
    id: string;
}

export interface IDatabaseFindManyWithPagination<TEntity, TTransaction> {
    limit: number;
    skip: number;
    where?: IDatabaseFilter<TEntity>;
    select?: Record<string, boolean>;
    order?: IDatabaseOrder;
    join?: IDatabaseJoin;
    withDeleted?: boolean;
    transaction?: TTransaction;
}

export type IDatabaseFindMany<TEntity, TTransaction> = Partial<
    IDatabaseFindManyWithPagination<TEntity, TTransaction>
>;

export type IDatabaseCount<TEntity, TTransaction> = Pick<
    IDatabaseFindMany<TEntity, TTransaction>,
    'where' | 'withDeleted' | 'transaction'
>;

export interface IDatabaseFindOne<TEntity, TTransaction>
    extends Pick<
        IDatabaseFindMany<TEntity, TTransaction>,
        'select' | 'join' | 'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
}

export interface IDatabaseFindOneById<TTransaction>
    extends Pick<
        IDatabaseFindMany<unknown, TTransaction>,
        'select' | 'join' | 'withDeleted' | 'transaction'
    > {
    id: string;
}

export interface IDatabaseCreate<TEntity, TTransaction>
    extends Pick<IDatabaseFindMany<TEntity, TTransaction>, 'transaction'> {
    data: Omit<
        TEntity,
        'id' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'deletedBy' | 'deleted'
    > & {
        id?: string;
        createdAt?: Date;
        createdBy?: string;
    };
}

export interface IDatabaseUpdate<TEntity, TTransaction>
    extends Pick<
        IDatabaseFindMany<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
    data:
        | Partial<
              Omit<
                  TEntity,
                  | 'id'
                  | 'createdAt'
                  | 'createdBy'
                  | 'deletedAt'
                  | 'deletedBy'
                  | 'deleted'
              >
          >
        | Record<keyof TEntity, IDatabaseUpdateAtomic>;
}

export interface IDatabaseRaw<TRaw, TTransaction>
    extends Pick<IDatabaseFindMany<unknown, TTransaction>, 'transaction'> {
    raw: TRaw;
}

export interface IDatabaseUpsert<TEntity, TTransaction>
    extends Omit<IDatabaseUpdate<TEntity, TTransaction>, 'data'> {
    update: IDatabaseUpdate<TEntity, TTransaction>['data'];
    create: IDatabaseCreate<TEntity, TTransaction>['data'];
}

export interface IDatabaseDelete<TEntity, TTransaction>
    extends Pick<
        IDatabaseFindMany<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
}

export interface IDatabaseExist<TEntity, TTransaction>
    extends Pick<
        IDatabaseFindMany<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
}

export interface IDatabaseCreateMany<TEntity, TTransaction>
    extends Pick<IDatabaseFindMany<TEntity, TTransaction>, 'transaction'> {
    data: IDatabaseCreate<TEntity, TTransaction>['data'][];
}

export interface IDatabaseUpdateMany<TEntity, TTransaction>
    extends Pick<
        IDatabaseFindMany<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
    data: IDatabaseUpdate<TEntity, TTransaction>['data'];
}

export interface IDatabaseDeleteMany<TEntity, TTransaction>
    extends Pick<
        IDatabaseFindMany<TEntity, TTransaction>,
        'withDeleted' | 'transaction'
    > {
    where: IDatabaseFilter<TEntity>;
}

export interface IDatabaseSoftDelete<TEntity, TTransaction>
    extends Omit<IDatabaseDelete<TEntity, TTransaction>, 'withDeleted'> {
    data: {
        deletedAt?: Date;
        deletedBy?: string;
    };
}

export interface IDatabaseRestore<TEntity, TTransaction>
    extends Omit<IDatabaseSoftDelete<TEntity, TTransaction>, 'data'> {
    data: {
        restoreBy?: string;
    };
}

export type IDatabaseSoftDeleteMany<TEntity, TTransaction> =
    IDatabaseSoftDelete<TEntity, TTransaction>;

export type IDatabaseRestoreMany<TEntity, TTransaction> = IDatabaseRestore<
    TEntity,
    TTransaction
>;
