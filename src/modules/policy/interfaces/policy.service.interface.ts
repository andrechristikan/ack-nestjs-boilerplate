import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IPolicyRequirement,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';

export interface IPolicyService {
    buildAbility(request: IRequestApp): PolicyAbility;
    validatePolicyGuard(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): PolicyAbility;
}
