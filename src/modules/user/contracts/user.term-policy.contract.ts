import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { IUserTermPolicyContract } from '@modules/user/interfaces/user.interface';

/**
 * Term-policy acceptance a newly created user starts with: the per-type defaults written on the row, and the types every account must accept.
 * @public
 */
export const UserTermPolicyContract: IUserTermPolicyContract = {
    defaults: {
        [EnumTermPolicyType.cookies]: false,
        [EnumTermPolicyType.marketing]: false,
        [EnumTermPolicyType.privacy]: true,
        [EnumTermPolicyType.termsOfService]: true,
    },
    requiredTypes: [
        EnumTermPolicyType.termsOfService,
        EnumTermPolicyType.privacy,
    ],
};
