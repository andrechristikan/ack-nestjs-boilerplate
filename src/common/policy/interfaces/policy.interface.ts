import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';

export interface IPolicyAbility {
    subject: ENUM_POLICY_SUBJECT;
    action: ENUM_POLICY_ACTION[];
}
export interface IPolicyAbilityFlat {
    subject: ENUM_POLICY_SUBJECT;
    action: ENUM_POLICY_ACTION;
}

export type IPolicyAbilitySubject = InferSubjects<ENUM_POLICY_SUBJECT> | 'all';

export type IPolicyAbilityRule = MongoAbility<
    [ENUM_POLICY_ACTION, IPolicyAbilitySubject]
>;

export type IPolicyAbilityHandlerCallback = (
    ability: IPolicyAbilityRule
) => boolean;
