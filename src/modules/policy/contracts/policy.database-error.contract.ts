import { Prisma } from '@generated/prisma-client/client';
import {
    DatabaseRecordNotFoundCode,
    DatabaseUniqueConstraintCode,
} from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';

/** @public */
export const PolicyDatabaseErrorContract = {
    [DatabaseRecordNotFoundCode]: PolicyNotFoundException,
    [DatabaseUniqueConstraintCode]: {
        [Prisma.PolicyScalarFieldEnum.subject]: PolicyExistException,
    },
} satisfies IDatabaseErrorContract;
