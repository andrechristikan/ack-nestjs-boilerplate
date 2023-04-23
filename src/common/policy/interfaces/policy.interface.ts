import { InferSubjects, MongoAbility } from '@casl/ability';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/common/policy/constants/policy.enum.constant';
import { ENUM_ROLE_TYPE } from 'src/modules/role/constants/role.enum.constant';
import { UserPayloadPermissionSerialization } from 'src/modules/user/serializations/user.payload.serialization';

export interface IPolicyRule {
    subject: ENUM_POLICY_SUBJECT;
    action: ENUM_POLICY_ACTION[];
}
export interface IPolicyRuleAbility {
    subject: ENUM_POLICY_SUBJECT;
    action: ENUM_POLICY_ACTION;
}

export type IPolicySubjectAbility = InferSubjects<ENUM_POLICY_SUBJECT> | 'all';

export type IPolicyAbility = MongoAbility<
    [ENUM_POLICY_ACTION, IPolicySubjectAbility]
>;

interface IPolicyHandler {
    handle(ability: IPolicyAbility): boolean;
}

type IPolicyHandlerCallback = (ability: IPolicyAbility) => boolean;

export type PolicyHandler = IPolicyHandler | IPolicyHandlerCallback;

export interface IPolicyRequest {
    type: ENUM_ROLE_TYPE;
    permissions: UserPayloadPermissionSerialization[];
}
