import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IPolicyRequirement,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

export interface IPolicyService {
    buildAbility(request: IRequestApp): PolicyAbility;
    validatePolicyGuard(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): PolicyAbility;
    getPermittedFields(
        ability: PolicyAbility,
        action: EnumPolicyAction,
        subject: EnumPolicySubject
    ): string[] | undefined;
}
