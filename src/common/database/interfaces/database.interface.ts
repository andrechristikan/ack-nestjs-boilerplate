import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@common/pagination/enums/pagination.enum';
import { Types } from 'mongoose';

export type IDatabaseOrderDetail<TEntity> = Partial<
    Record<keyof TEntity, ENUM_PAGINATION_ORDER_DIRECTION_TYPE>
>;

export type IDatabaseOrder<TEntity> =
    | IDatabaseOrderDetail<TEntity>
    | IDatabaseOrderDetail<TEntity>[];

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

export type IDatabaseFilterOperation = IDatabaseFilterOperationComparison &
    IDatabaseFilterOperationString;

export type IDatabaseFilterValue<TEntity> = Partial<
    Record<
        keyof Omit<TEntity, 'deleted'>,
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

export type IDatabaseSelect<TEntity> = Partial<Record<keyof TEntity, boolean>>;

export interface IDatabaseJoinDetail {
    select?: IDatabaseSelect<unknown>;
    where?: IDatabaseFilter<unknown>;
    on?: {
        localField: string;
        foreignField: string;
    };
    from: string;
    multiple?: {
        enabled: boolean;
        limit?: number;
        skip?: number;
    };
    join?: IDatabaseJoin;
}

export type IDatabaseJoin = Record<string, IDatabaseJoinDetail>;

export interface IDatabasePaginationReturn<TEntity> {
    items: TEntity[];
    count: number;
    page: number;
    totalPage: number;
}
export interface IDatabaseManyReturn {
    count: number;
    ids?: Types.ObjectId[];
}

export interface IDatabaseExistReturn {
    _id: Types.ObjectId;
}

export interface IDatabaseFindManyWithPagination<TEntity, TTransaction> {
    limit: number;
    skip: number;
    where?: IDatabaseFilter<Omit<TEntity, 'deleted'>>;
    select?: IDatabaseSelect<TEntity>;
    order?: IDatabaseOrder<TEntity>;
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
    where: IDatabaseFilter<Omit<TEntity, 'deleted'>>;
}

export interface IDatabaseFindOneById<TTransaction>
    extends Pick<
        IDatabaseFindMany<unknown, TTransaction>,
        'select' | 'join' | 'withDeleted' | 'transaction'
    > {
    where: { _id: Types.ObjectId };
}

export interface IDatabaseCreate<TEntity, TTransaction>
    extends Pick<IDatabaseFindMany<TEntity, TTransaction>, 'transaction'> {
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
    data?: {
        deletedAt?: Date;
        deletedBy?: string;
    };
}

export interface IDatabaseRestore<TEntity, TTransaction>
    extends Omit<IDatabaseSoftDelete<TEntity, TTransaction>, 'data'> {
    data?: {
        restoreBy?: string;
    };
}

export type IDatabaseSoftDeleteMany<TEntity, TTransaction> =
    IDatabaseSoftDelete<TEntity, TTransaction>;

export type IDatabaseRestoreMany<TEntity, TTransaction> = IDatabaseRestore<
    TEntity,
    TTransaction
>;
