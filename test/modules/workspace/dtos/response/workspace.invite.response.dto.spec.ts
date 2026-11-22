import {
    EnumRoleScope,
    EnumWorkspaceInviteStatus,
} from '@generated/prisma-client';
import { WorkspaceInviteResponseSchema } from '@modules/workspace/dtos/response/workspace.invite.response.dto';

describe('WorkspaceInviteResponseSchema', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const workspaceRole = {
        id: '01890a5d-ac96-774b-bcce-b302099a8057',
        scope: EnumRoleScope.workspace,
        key: 'member',
        name: 'Member',
    };
    const projectRole = {
        id: '01890a5d-ac96-774b-bcce-b302099a8058',
        scope: EnumRoleScope.project,
        key: 'viewer',
        name: 'Viewer',
    };
    const base = {
        id: '01890a5d-ac96-774b-bcce-b302099a8060',
        workspaceId: '01890a5d-ac96-774b-bcce-b302099a8061',
        email: 'invitee@example.com',
        workspaceRole,
        projectId: null,
        projectRole: null,
        reference: 'WIN-abc',
        expiredAt: now,
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: null,
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };

    it('returns the workspace role as an id, scope, key and name object', () => {
        const result = WorkspaceInviteResponseSchema.parse({
            ...base,
            workspaceRole: {
                ...workspaceRole,
                description: 'extra',
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
                policies: [],
            },
        });
        expect(result.workspaceRole).toEqual(workspaceRole);
        expect(result.projectRole).toBeNull();
    });

    it('returns the project role as an id, scope, key and name object when granted', () => {
        const result = WorkspaceInviteResponseSchema.parse({
            ...base,
            projectId: '01890a5d-ac96-774b-bcce-b302099a8062',
            projectRole: {
                ...projectRole,
                description: 'extra',
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
                policies: [],
            },
        });
        expect(result.projectRole).toEqual(projectRole);
    });

    it('rejects bare role keys in place of the role objects', () => {
        expect(
            WorkspaceInviteResponseSchema.safeParse({
                ...base,
                workspaceRole: 'member',
            }).success
        ).toBe(false);
        expect(
            WorkspaceInviteResponseSchema.safeParse({
                ...base,
                projectRole: 'viewer',
            }).success
        ).toBe(false);
    });

    it('strips the hashed token', () => {
        const result = WorkspaceInviteResponseSchema.parse({
            ...base,
            token: 'hashed',
        });
        expect(result).not.toHaveProperty('token');
    });
});
