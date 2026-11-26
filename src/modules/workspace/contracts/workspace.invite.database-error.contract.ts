import { Prisma } from '@generated/prisma-client/client';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { WorkspaceInviteReferenceExistException } from '@modules/workspace/exceptions/workspace.invite-reference-exist.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';

/** @public */
export const WorkspaceInviteDatabaseErrorContract = {
    [DatabaseUniqueConstraintCode]: {
        [Prisma.WorkspaceInviteScalarFieldEnum.reference]:
            WorkspaceInviteReferenceExistException,
        [Prisma.WorkspaceInviteScalarFieldEnum.nonce]:
            WorkspaceInviteDuplicateException,
    },
} satisfies IDatabaseErrorContract;
