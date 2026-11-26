import { Prisma } from '@generated/prisma-client/client';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';

/** @public */
export const WorkspaceDatabaseErrorContract = {
    [DatabaseUniqueConstraintCode]: {
        [Prisma.WorkspaceScalarFieldEnum.slug]:
            WorkspaceSlugAlreadyExistsException,
    },
} satisfies IDatabaseErrorContract;
