import { Prisma } from '@generated/prisma-client/client';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';

/** @public */
export const ProjectDatabaseErrorContract = {
    [DatabaseUniqueConstraintCode]: {
        [Prisma.ProjectScalarFieldEnum.slug]: ProjectSlugAlreadyExistsException,
    },
} satisfies IDatabaseErrorContract;
