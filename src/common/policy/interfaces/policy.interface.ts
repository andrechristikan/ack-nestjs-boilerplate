import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';

export interface IPolicy {
    subject: ENUM_POLICY_SUBJECT;
    action: ENUM_POLICY_ACTION[];
}
export interface IPolicyFlat {
    subject: ENUM_POLICY_SUBJECT;
    action: ENUM_POLICY_ACTION;
}

export type IPolicySubject = InferSubjects<ENUM_POLICY_SUBJECT> | 'all';

export type IPolicyRule = MongoAbility<[ENUM_POLICY_ACTION, IPolicySubject]>;

interface IPolicyHandler {
    handle(ability: IPolicyRule): boolean;
}

type IPolicyHandlerCallback = (ability: IPolicyRule) => boolean;

export type PolicyHandler = IPolicyHandler | IPolicyHandlerCallback;
