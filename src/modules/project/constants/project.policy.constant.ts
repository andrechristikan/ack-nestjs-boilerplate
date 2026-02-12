import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

export const ProjectPolicyRead: RoleAbilityRequestDto = {
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.read],
};

export const ProjectPolicyCreate: RoleAbilityRequestDto = {
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.create],
};

export const ProjectPolicyUpdate: RoleAbilityRequestDto = {
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.update],
};

export const ProjectPolicyDelete: RoleAbilityRequestDto = {
    subject: EnumPolicySubject.project,
    action: [EnumPolicyAction.delete],
};
