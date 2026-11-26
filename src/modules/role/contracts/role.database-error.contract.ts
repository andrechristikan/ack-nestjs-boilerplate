import { Prisma } from '@generated/prisma-client/client';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';

/** @public */
export const RoleDatabaseErrorContract = {
    [DatabaseUniqueConstraintCode]: {
        [Prisma.RoleScalarFieldEnum.name]: RoleExistException,
    },
} satisfies IDatabaseErrorContract;
