import type { AppBaseException } from '@app/exceptions/app.base.exception';
import type { Prisma } from '@generated/prisma-client/client';

type IDatabaseScalarFieldEnum<M extends Prisma.ModelName> =
    (typeof Prisma)[`${M}ScalarFieldEnum`];

export type IDatabaseScalarField = {
    [
        M in Prisma.ModelName
    ]: IDatabaseScalarFieldEnum<M>[keyof IDatabaseScalarFieldEnum<M>];
}[Prisma.ModelName];

export interface IDatabaseUniqueCollision {
    field: IDatabaseScalarField;
    exception: AppBaseException;
}
