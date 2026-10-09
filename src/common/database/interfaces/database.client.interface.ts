import type { Prisma } from '@generated/prisma-client/client';
import type * as runtime from '@prisma/client/runtime/library';
import type {
    IDatabaseRestoreArgs,
    IDatabaseSoftDeleteArgs,
} from '@common/database/interfaces/database.extension.interface';

export interface IDatabaseClientOptions extends Prisma.PrismaClientOptions {
    log: Prisma.LogDefinition[];
}

interface IDatabaseExtensionModel {
    $allModels: {
        softDelete<T>(this: T, args: IDatabaseSoftDeleteArgs): Promise<unknown>;
        restore<T>(this: T, args: IDatabaseRestoreArgs): Promise<unknown>;
    };
}

type IDatabaseExtensionArgs = runtime.Types.Extensions.InternalArgs<
    Record<never, never>,
    IDatabaseExtensionModel,
    Record<never, never>,
    Record<never, never>
>;

export type IDatabaseExtension = (client: unknown) => {
    $extends: { extArgs: IDatabaseExtensionArgs };
};

type IDatabaseMergedArgs = runtime.Types.Extensions.MergeExtArgs<
    Prisma.TypeMap,
    runtime.Types.Extensions.DefaultArgs,
    IDatabaseExtensionArgs
>;

export type IDatabaseClient =
    runtime.Types.Extensions.DynamicClientExtensionThis<
        Prisma.TypeMap<IDatabaseMergedArgs>,
        Prisma.TypeMapCb,
        IDatabaseMergedArgs
    >;

// Derived from IDatabaseClient: Prisma.TransactionClient does not carry this
// client's extensions and will not match it.
export type IDatabaseTransactionClient = Parameters<
    Parameters<IDatabaseClient['$transaction']>[0]
>[0];

export type IDatabaseTransactionOptions = NonNullable<
    Prisma.PrismaClientOptions['transactionOptions']
>;
