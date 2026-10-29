import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { IUserTermPolicyContract } from '@modules/user/interfaces/user.interface';

/**
 * Term policy types every new account accepts at creation.
 * @public
 */
export const UserTermPolicyContract: IUserTermPolicyContract = {
    requiredTypes: TermPolicyDefaultRequiredTypes,
};
