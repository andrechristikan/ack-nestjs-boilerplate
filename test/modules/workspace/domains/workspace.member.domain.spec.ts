import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
    type WorkspaceMember,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';

describe('WorkspaceMemberDomain', () => {
    const memberRepository = createMock<WorkspaceMemberRepository>();
    const workspaceRepository = createMock<WorkspaceRepository>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const owner = createMock<WorkspaceMember>({
        id: 'owner-member-id',
        userId: 'owner-id',
        workspaceId: 'workspace-id',
        role: EnumWorkspaceMemberRole.owner,
    });
    const admin = createMock<WorkspaceMember>({
        id: 'admin-member-id',
        userId: 'admin-id',
        workspaceId: 'workspace-id',
        role: EnumWorkspaceMemberRole.admin,
    });
    const otherAdmin = createMock<WorkspaceMember>({
        id: 'other-admin-member-id',
        userId: 'other-admin-id',
        workspaceId: 'workspace-id',
        role: EnumWorkspaceMemberRole.admin,
    });
    const member = createMock<WorkspaceMember>({
        id: 'member-id',
        userId: 'member-id',
        workspaceId: 'workspace-id',
        role: EnumWorkspaceMemberRole.member,
    });

    let domain: WorkspaceMemberDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        domain = new WorkspaceMemberDomain(
            memberRepository,
            workspaceRepository,
            activityLogDomain
        );
    });

    it('rejects member validation without a user', async () => {
        await expect(
            domain.validateWorkspaceMemberGuard('workspace-id', null)
        ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
    });

    it('rejects member validation without a workspace', async () => {
        await expect(
            domain.validateWorkspaceMemberGuard(null, 'user-id')
        ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
    });

    it('rejects a user who is not a workspace member', async () => {
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(null);
        await expect(
            domain.validateWorkspaceMemberGuard('workspace-id', 'user-id')
        ).rejects.toBeInstanceOf(WorkspaceMemberForbiddenException);
    });

    it('returns a valid workspace member', async () => {
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(member);
        await expect(
            domain.validateWorkspaceMemberGuard('workspace-id', 'user-id')
        ).resolves.toBe(member);
    });

    it('allows an owner regardless of the declared roles', () => {
        expect(domain.validateWorkspaceRoleGuard(owner, [])).toBe(owner);
    });

    it('rejects a missing or disallowed workspace role', () => {
        expect(() =>
            domain.validateWorkspaceRoleGuard(null, [
                EnumWorkspaceMemberRole.admin,
            ])
        ).toThrow(WorkspaceRoleForbiddenException);
        expect(() =>
            domain.validateWorkspaceRoleGuard(member, [
                EnumWorkspaceMemberRole.admin,
            ])
        ).toThrow(WorkspaceRoleForbiddenException);
    });

    it('rejects transferring ownership to oneself', async () => {
        await expect(
            domain.transferOwnership('workspace-id', owner, owner.userId)
        ).rejects.toBeInstanceOf(WorkspaceSelfTransferException);
        expect(
            memberRepository.findOneByWorkspaceAndUser
        ).not.toHaveBeenCalled();
    });

    it('rejects transferring ownership to a non-member', async () => {
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(null);
        await expect(
            domain.transferOwnership('workspace-id', owner, 'missing')
        ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
    });

    it('transfers ownership and stages the activity atomically', async () => {
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(member);
        await domain.transferOwnership('workspace-id', owner, member.userId);
        expect(memberRepository.transferOwnership).toHaveBeenCalledWith(
            owner.id,
            member.id
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.workspaceOwnershipTransferred,
            userId: owner.userId,
            createdBy: owner.userId,
            workspaceId: 'workspace-id',
            metadata: { targetUserId: member.userId },
        });
    });

    it('prevents the last owner from leaving', async () => {
        memberRepository.countOwners.mockResolvedValue(1);
        await expect(
            domain.leaveWorkspace('workspace-id', owner)
        ).rejects.toBeInstanceOf(WorkspaceLastOwnerException);
        expect(memberRepository.removeMember).not.toHaveBeenCalled();
    });

    it('allows a non-owner to leave without counting owners', async () => {
        await domain.leaveWorkspace('workspace-id', member);
        expect(memberRepository.countOwners).not.toHaveBeenCalled();
        expect(memberRepository.removeMember).toHaveBeenCalledWith(member.id);
    });

    it.each([
        [owner, WorkspaceMemberPeerForbiddenException],
        [admin, WorkspaceMemberPeerForbiddenException],
    ])(
        'prevents an admin from changing a protected peer role',
        async target => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(target);
            await expect(
                domain.updateMemberRole(
                    'workspace-id',
                    admin,
                    target.id,
                    EnumWorkspaceMemberRole.member
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
        }
    );

    it('rejects updating the role of a member that is not found', async () => {
        memberRepository.findByIdAndWorkspace.mockResolvedValue(null);
        await expect(
            domain.updateMemberRole(
                'workspace-id',
                admin,
                'missing-id',
                EnumWorkspaceMemberRole.member
            )
        ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
    });

    it('updates a member role and stages activity', async () => {
        memberRepository.findByIdAndWorkspace.mockResolvedValue(member);
        await domain.updateMemberRole(
            'workspace-id',
            admin,
            member.id,
            EnumWorkspaceMemberRole.admin
        );
        expect(memberRepository.updateRole).toHaveBeenCalledWith(
            member.id,
            EnumWorkspaceMemberRole.admin
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.workspaceMemberRoleUpdated,
            userId: admin.userId,
            createdBy: admin.userId,
            workspaceId: 'workspace-id',
            metadata: { targetUserId: member.userId },
        });
    });

    it('prevents a member from removing itself', async () => {
        memberRepository.findByIdAndWorkspace.mockResolvedValue(member);
        await expect(
            domain.removeMember('workspace-id', member, member.id)
        ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
    });

    it('rejects removing a member that is not found', async () => {
        memberRepository.findByIdAndWorkspace.mockResolvedValue(null);
        await expect(
            domain.removeMember('workspace-id', admin, 'missing-id')
        ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
    });

    it.each([
        [owner, WorkspaceMemberPeerForbiddenException],
        [otherAdmin, WorkspaceMemberPeerForbiddenException],
    ])('prevents an admin from removing a protected peer', async target => {
        memberRepository.findByIdAndWorkspace.mockResolvedValue(target);
        await expect(
            domain.removeMember('workspace-id', admin, target.id)
        ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
    });

    it('removes a member and stages activity', async () => {
        memberRepository.findByIdAndWorkspace.mockResolvedValue(member);
        await domain.removeMember('workspace-id', admin, member.id);
        expect(memberRepository.removeMember).toHaveBeenCalledWith(member.id);
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.workspaceMemberRemoved,
            userId: admin.userId,
            createdBy: admin.userId,
            workspaceId: 'workspace-id',
            metadata: { targetUserId: member.userId },
        });
    });
});
