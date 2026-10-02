import {
    EnumRoleScope,
    EnumWorkspaceInviteStatus,
    type Workspace,
} from '@generated/prisma-client';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import type { IWorkspaceInviteWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceUtil', () => {
    const util = new WorkspaceUtil();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-02-01T00:00:00.000Z');

    const workspace = {
        id: 'workspace-id',
        name: 'Acme',
        slug: 'acme',
        description: null,
        isPublic: false,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    } satisfies Workspace;

    const workspaceRole = {
        id: 'admin-role-id',
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.admin,
        name: 'Admin',
    };

    const invite = {
        id: 'invite-id',
        workspaceId: 'workspace-id',
        email: 'a@b.com',
        workspaceRoleId: workspaceRole.id,
        workspaceRole,
        projectId: null,
        projectRoleId: null,
        projectRole: null,
        token: 'token',
        reference: 'ref',
        expiredAt,
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: null,
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies IWorkspaceInviteWithRole;

    describe('mapInvite', () => {
        it('drops the hashed token and the role id columns and keeps the role objects', () => {
            const mapped = util.mapInvite(invite);

            expect(mapped).not.toHaveProperty('token');
            expect(mapped).not.toHaveProperty('workspaceRoleId');
            expect(mapped).not.toHaveProperty('projectRoleId');
            expect(mapped).toEqual({
                id: 'invite-id',
                workspaceId: 'workspace-id',
                email: 'a@b.com',
                workspaceRole,
                projectId: null,
                projectRole: null,
                reference: 'ref',
                expiredAt,
                status: EnumWorkspaceInviteStatus.pending,
                invitedByUserId: null,
                acceptedAt: null,
                acceptedByUserId: null,
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
            });
        });
    });

    describe('mapInvitePreview', () => {
        it('prefers the inviter name and forwards the role object and expiry', () => {
            expect(
                util.mapInvitePreview(workspace, invite, {
                    name: 'Jane',
                    username: 'jane',
                })
            ).toEqual({
                workspaceName: 'Acme',
                inviterName: 'Jane',
                workspaceRole,
                expiredAt,
            });
        });

        it('falls back to the inviter username when the name is null', () => {
            expect(
                util.mapInvitePreview(workspace, invite, {
                    name: null,
                    username: 'jane',
                }).inviterName
            ).toBe('jane');
        });

        it('falls back to the workspace name when there is no inviter', () => {
            expect(
                util.mapInvitePreview(workspace, invite, null).inviterName
            ).toBe('Acme');
        });
    });
});
