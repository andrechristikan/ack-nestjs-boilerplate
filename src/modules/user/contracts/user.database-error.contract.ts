import { Prisma } from '@generated/prisma-client/client';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';

/** @public */
export const UserDatabaseErrorContract = {
    [DatabaseUniqueConstraintCode]: {
        [Prisma.UserScalarFieldEnum.username]: UserUsernameExistException,
        [Prisma.UserScalarFieldEnum.email]: UserEmailExistException,
    },
} satisfies IDatabaseErrorContract;
