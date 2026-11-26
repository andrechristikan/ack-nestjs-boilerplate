import { Prisma } from '@generated/prisma-client/client';
import {
    DatabaseRecordNotFoundCode,
    DatabaseUniqueConstraintCode,
} from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { WorkspaceJoinRequestAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.join-request-already-processed.exception';
import { WorkspaceJoinRequestDuplicateException } from '@modules/workspace/exceptions/workspace.join-request-duplicate.exception';

/** @public */
export const WorkspaceJoinRequestDatabaseErrorContract = {
    [DatabaseRecordNotFoundCode]: WorkspaceJoinRequestAlreadyProcessedException,
    [DatabaseUniqueConstraintCode]: {
        [Prisma.WorkspaceJoinRequestScalarFieldEnum.nonce]:
            WorkspaceJoinRequestDuplicateException,
    },
} satisfies IDatabaseErrorContract;
