import type { Prisma } from '@generated/prisma-client/client';
import type * as runtime from '@prisma/client/runtime/library';
import type {
    IDatabaseRestoreArgs,
    IDatabaseSoftDeletable,
    IDatabaseSoftDeleteArgs,
    IDatabaseSoftDeleteResult,
} from '@common/database/interfaces/database.extension.interface';

export interface IDatabaseClientOptions extends Prisma.PrismaClientOptions {
    log: Prisma.LogDefinition[];
}

interface IDatabaseExtensionModel {
    $allModels: {
        softDelete<T>(
            this: IDatabaseSoftDeletable<T>,
            args: IDatabaseSoftDeleteArgs<T>
        ): Promise<IDatabaseSoftDeleteResult<T>>;
        restore<T>(
            this: IDatabaseSoftDeletable<T>,
            args: IDatabaseRestoreArgs<T>
        ): Promise<IDatabaseSoftDeleteResult<T>>;
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

/** Derived from IDatabaseClient: Prisma.TransactionClient lacks this client's extensions. */
export type IDatabaseTransactionClient = Parameters<
    Parameters<IDatabaseClient['$transaction']>[0]
>[0];

export type IDatabaseTransactionOptions = NonNullable<
    Prisma.PrismaClientOptions['transactionOptions']
>;

export interface IDatabaseQueryLog {
    model: string | null;
    action: string | null;
    duration: number;
    isSlow: boolean;
}
