import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';

export type IPolicySubject = `${ENUM_POLICY_SUBJECT}`;

export interface IPolicyRule {
    subject: IPolicySubject;
    action: ENUM_POLICY_ACTION[];
}

export interface IPolicyRuleAbility {
    subject: IPolicySubject;
    action: ENUM_POLICY_ACTION;
}

export type IPolicySubjectAbility = InferSubjects<IPolicySubject> | 'all';

export type IPolicyAbility = MongoAbility<
    [ENUM_POLICY_ACTION, IPolicySubjectAbility]
>;

interface IPolicyHandler {
    handle(ability: IPolicyAbility): boolean;
}

type IPolicyHandlerCallback = (ability: IPolicyAbility) => boolean;

export type PolicyHandler = IPolicyHandler | IPolicyHandlerCallback;
