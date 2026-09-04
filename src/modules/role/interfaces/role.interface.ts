import { EnumRoleType } from '@generated/prisma-client';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

export interface IRole {
    id: string;
    type: EnumRoleType;
    name: string;
}

export interface IRoleAbility {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
}

export interface IRoleUpdate {
    description?: string;
    type: EnumRoleType;
    abilities: IRoleAbility[];
}

export interface IRoleCreate extends IRoleUpdate {
    name: Lowercase<string>;
}
