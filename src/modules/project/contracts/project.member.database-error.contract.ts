import { Prisma } from '@generated/prisma-client/client';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';

/** @public */
export const ProjectMemberDatabaseErrorContract = {
    [DatabaseUniqueConstraintCode]: {
        [Prisma.ProjectMemberScalarFieldEnum.userId]:
            ProjectMemberAlreadyAssignedException,
    },
} satisfies IDatabaseErrorContract;
