import { EnumProjectMemberRole } from '@generated/prisma-client';

export const ProjectRoleAdmin = EnumProjectMemberRole.admin;
export const ProjectRoleMember = EnumProjectMemberRole.member;
export const ProjectRoleViewer = EnumProjectMemberRole.viewer;
export const ProjectInviteType = 'projectMember';
export const ProjectInviteEmailTypeLabel = 'project_member';

export const ProjectPermissionRequiredMetaKey =
    'ProjectPermissionRequiredMetaKey';
