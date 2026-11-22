import type { Prisma } from '@generated/prisma-client/client';

export type IDatabaseData = Record<string, unknown>;

export type IDatabaseSoftDeletable<T> = 'deletedAt' extends keyof Prisma.Args<
    T,
    'update'
>['data']
    ? T
    : never;

export interface IDatabaseSoftDeleteArgs<T> {
    where: Prisma.Args<T, 'update'>['where'];
    data?: Prisma.Args<T, 'update'>['data'];
}

export interface IDatabaseRestoreArgs<T> {
    where: Prisma.Args<T, 'update'>['where'];
    data?: Prisma.Args<T, 'update'>['data'];
}

export type IDatabaseSoftDeleteResult<T> = Prisma.Result<
    T,
    { where: object; data: object },
    'update'
>;

export interface IDatabaseModelContext<T> {
    update: (args: {
        where: IDatabaseSoftDeleteArgs<T>['where'];
        data: IDatabaseData;
    }) => Promise<IDatabaseSoftDeleteResult<T>>;
}
