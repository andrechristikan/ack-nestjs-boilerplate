import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

export type IPolicyAbilitySubject = InferSubjects<EnumPolicySubject> | 'all';

export type IPolicyAbilityRule = MongoAbility<
    [EnumPolicyAction, IPolicyAbilitySubject]
>;
