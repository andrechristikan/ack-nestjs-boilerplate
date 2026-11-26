import { Prisma } from '@generated/prisma-client/client';
import { DatabaseUniqueConstraintCode } from '@common/database/constants/database.constant';
import type { IDatabaseErrorContract } from '@common/database/interfaces/database.interface';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';

/** @public */
export const TermPolicyDatabaseErrorContract = {
    [DatabaseUniqueConstraintCode]: {
        [Prisma.TermPolicyUserAcceptanceScalarFieldEnum.termPolicyId]:
            TermPolicyAlreadyAcceptedException,
    },
} satisfies IDatabaseErrorContract;
