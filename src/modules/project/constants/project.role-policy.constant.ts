import { EnumProjectMemberRole } from '@generated/prisma-client';
import {
    ProjectMemberPolicyCreate,
    ProjectMemberPolicyDelete,
    ProjectMemberPolicyRead,
    ProjectMemberPolicyUpdate,
    ProjectPolicyDelete,
    ProjectPolicyRead,
    ProjectPolicyUpdate,
} from '@modules/project/constants/project.policy.constant';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

const ProjectRoleAbilities: Record<
    EnumProjectMemberRole,
    RoleAbilityRequestDto[]
> = {
    [EnumProjectMemberRole.admin]: [
        ProjectPolicyRead,
        ProjectPolicyUpdate,
        ProjectPolicyDelete,
        ProjectMemberPolicyRead,
        ProjectMemberPolicyCreate,
        ProjectMemberPolicyUpdate,
        ProjectMemberPolicyDelete,
    ],
    [EnumProjectMemberRole.member]: [ProjectPolicyRead, ProjectMemberPolicyRead],
    [EnumProjectMemberRole.viewer]: [ProjectPolicyRead, ProjectMemberPolicyRead],
};

export function getProjectRoleAbilities(
    role: EnumProjectMemberRole
): RoleAbilityRequestDto[] {
    return ProjectRoleAbilities[role] ?? [];
}
