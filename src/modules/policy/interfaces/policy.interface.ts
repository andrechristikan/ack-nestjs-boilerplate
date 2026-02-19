import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicyMatch,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

export type IPolicyAbilitySubject = InferSubjects<EnumPolicySubject> | 'all';

export type IPolicyAbilityRule = MongoAbility<
    [EnumPolicyAction, IPolicyAbilitySubject]
>;

export type PolicySubjectResolver = (
    request: IRequestApp
) => Record<string, unknown> | undefined | null;

export interface IPolicyRequirement {
    rules: RoleAbilityRequestDto[];
    match?: EnumPolicyMatch;
    resource?: Record<string, unknown> | PolicySubjectResolver;
}
