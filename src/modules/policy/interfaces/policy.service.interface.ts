import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IPolicyAbilityRule,
    IPolicyRequirement,
} from '@modules/policy/interfaces/policy.interface';

export interface IPolicyService {
    authorize(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): Promise<boolean>;
    getOrCreateRequestAbility(request: IRequestApp): IPolicyAbilityRule;
}
