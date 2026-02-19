import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';
import { IPolicyRequirement } from '@modules/policy/interfaces/policy.interface';

export interface IPolicyService {
    authorize(
        request: IRequestApp,
        requirements: IPolicyRequirement[]
    ): Promise<boolean>;
    getOrCreateRequestAbility(request: IRequestApp): IPolicyAbilityRule;
    getAccessibleWhere(
        request: IRequestApp,
        subject: EnumPolicySubject,
        action: EnumPolicyAction
    ): Record<string, unknown>;
}
