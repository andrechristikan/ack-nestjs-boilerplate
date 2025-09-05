import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';

export type IPolicyAbilitySubject = InferSubjects<ENUM_POLICY_SUBJECT> | 'all';

export type IPolicyAbilityRule = MongoAbility<
    [ENUM_POLICY_ACTION, IPolicyAbilitySubject]
>;
