import type { Prisma } from '@generated/prisma-client/client';

export type IDatabaseData = Record<string, unknown>;

export interface IDatabaseModelContext {
    update: (args: { where: unknown; data: IDatabaseData }) => Promise<unknown>;
}

export interface IDatabaseSoftDeleteData extends IDatabaseData {
    deletedAt?: Date;
    deletedBy?: string;
    updatedBy?: string;
}

export interface IDatabaseSoftDeleteArgs {
    where: unknown;
    data?: IDatabaseSoftDeleteData;
}

export interface IDatabaseRestoreData extends IDatabaseData {
    updatedBy?: string;
}

export interface IDatabaseRestoreArgs {
    where: unknown;
    data?: IDatabaseRestoreData;
}

type IDatabaseModelRelationPayloads<M extends Prisma.ModelName> =
    Prisma.TypeMap['model'][M]['payload']['objects'];

type IDatabaseModelRelationName<P> =
    NonNullable<P> extends readonly (infer E)[]
        ? IDatabaseModelRelationName<E>
        : NonNullable<P> extends { name: infer N extends Prisma.ModelName }
          ? N
          : never;

export type IDatabaseModelRelations = {
    [
        M in Prisma.ModelName
    ]: keyof IDatabaseModelRelationPayloads<M> extends never
        ? Record<string, never>
        : {
              [
                  F in keyof IDatabaseModelRelationPayloads<M>
              ]: IDatabaseModelRelationName<
                  IDatabaseModelRelationPayloads<M>[F]
              >;
          };
};
