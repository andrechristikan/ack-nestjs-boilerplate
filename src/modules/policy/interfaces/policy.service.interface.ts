import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    PolicyAbility,
    IPolicyRequirement,
} from '@modules/policy/interfaces/policy.interface';

export interface IPolicyService {
    validatePolicyGuard(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): boolean;
    getOrCreateRequestAbility(request: IRequestApp): PolicyAbility;
}
