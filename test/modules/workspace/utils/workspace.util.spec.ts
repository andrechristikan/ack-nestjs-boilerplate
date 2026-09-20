import { describe, expect, it } from 'vitest';

import {
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
    type Workspace,
    type WorkspaceInvite,
} from '@generated/prisma-client';
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

    const invite = {
        id: 'invite-id',
        workspaceId: 'workspace-id',
        email: 'a@b.com',
        workspaceRole: EnumWorkspaceMemberRole.admin,
        projectId: null,
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
    } satisfies WorkspaceInvite;

    describe('mapInvitePreview', () => {
        it('prefers the inviter name and forwards role and expiry', () => {
            expect(
                util.mapInvitePreview(workspace, invite, {
                    name: 'Jane',
                    username: 'jane',
                })
            ).toEqual({
                workspaceName: 'Acme',
                inviterName: 'Jane',
                workspaceRole: EnumWorkspaceMemberRole.admin,
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
