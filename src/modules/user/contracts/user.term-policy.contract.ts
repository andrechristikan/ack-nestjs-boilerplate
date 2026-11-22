import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { IUserTermPolicyContract } from '@modules/user/interfaces/user.interface';

/** @public */
export const UserTermPolicyContract: IUserTermPolicyContract = {
    requiredTypes: TermPolicyDefaultRequiredTypes,
};
