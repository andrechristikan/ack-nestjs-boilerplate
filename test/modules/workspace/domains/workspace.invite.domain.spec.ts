import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';

import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
    type Project,
    type User,
    type Workspace,
    type WorkspaceInvite,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationEmailQueue } from '@modules/notification/queues/notification.email.queue';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceInviteNotFoundException } from '@modules/workspace/exceptions/workspace.invite-not-found.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';

const now = new Date('2026-01-01T00:00:00.000Z');
const expiredAt = new Date('2026-01-08T00:00:00.000Z');
const workspace: Workspace = {
    id: 'workspace-id',
    name: 'Workspace',
    slug: 'workspace',
    description: null,
    isPublic: false,
    createdAt: now,
    createdBy: null,
    updatedAt: now,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
};
const invite: WorkspaceInvite = {
    id: 'invite-id',
    workspaceId: workspace.id,
    email: 'invitee@example.com',
    workspaceRole: EnumWorkspaceMemberRole.member,
    projectId: 'project-id',
    projectRole: EnumProjectMemberRole.member,
    token: 'hashed-token',
    reference: 'INV-REF',
    expiredAt,
    status: EnumWorkspaceInviteStatus.pending,
    invitedByUserId: 'inviter-id',
    acceptedAt: null,
    acceptedByUserId: null,
    createdAt: now,
    createdBy: null,
    updatedAt: now,
    updatedBy: null,
};
const existingUser = mock<User>({
    id: 'existing-user-id',
    email: invite.email,
    name: 'Existing User',
    username: 'existing',
});

describe('WorkspaceInviteDomain', () => {
    const inviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const memberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const memberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const onboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const dateService: MockProxy<HelperDateService> = mock<HelperDateService>();
    const stringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const hashService: MockProxy<HelperHashService> = mock<HelperHashService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationEmailQueue: MockProxy<NotificationEmailQueue> =
        mock<NotificationEmailQueue>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const tx = {} as IDatabaseTransactionClient;
    const create = {
        email: invite.email as Lowercase<string>,
        workspaceRole: invite.workspaceRole,
        projectId: invite.projectId!,
        projectRole: invite.projectRole!,
    };

    let domain: WorkspaceInviteDomain;

    beforeEach(async () => {
        vi.mocked(configService.get).mockImplementation((key: string) => {
            if (key === 'home.url') return 'https://example.com';
            if (key === 'workspace.invite.expiredInDays') return 7;
            if (key === 'workspace.invite.tokenLength') return 32;
            if (key === 'workspace.invite.referencePrefix') return 'INV';
            if (key === 'workspace.invite.referenceRandomLength') return 8;
            if (key === 'workspace.invite.linkPattern')
                return '{homeUrl}/claim/{token}';
            if (key === 'workspace.invite.signUpLinkPattern')
                return '{homeUrl}/signup/{token}';
            return undefined;
        });
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(tx)
        );
        databaseUtil.createId.mockReturnValue(invite.id);
        stringService.random
            .mockReturnValueOnce('plain-token')
            .mockReturnValueOnce('REF');
        stringService.fillPattern
            .mockReturnValueOnce('https://example.com/claim/plain-token')
            .mockReturnValueOnce('https://example.com/signup/plain-token');
        hashService.sha256Hash.mockReturnValue('hashed-token');
        dateService.create.mockReturnValue(now);
        dateService.forward.mockReturnValue(expiredAt);
        dateService.formatToIso.mockReturnValue('2026-01-08T00:00:00.000Z');
        inviteRepository.createPending.mockResolvedValue(invite);
        inviteRepository.rotateForResend.mockResolvedValue(invite);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteDomain,
                {
                    provide: WorkspaceInviteRepository,
                    useValue: inviteRepository,
                },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: memberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                { provide: WorkspaceMemberDomain, useValue: memberDomain },
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: UserOnboardingDomain, useValue: onboardingDomain },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: dateService },
                { provide: HelperStringService, useValue: stringService },
                { provide: HelperHashService, useValue: hashService },
                { provide: ConfigService, useValue: configService },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: NotificationEmailQueue,
                    useValue: notificationEmailQueue,
                },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
            ],
        }).compile();
        domain = module.get(WorkspaceInviteDomain);
    });

    it('rejects an invalid invite token and returns a pending invite', async () => {
        inviteRepository.findPendingByHashedToken
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(invite);
        await expect(domain.validateInviteToken('bad')).rejects.toBeInstanceOf(
            WorkspaceInviteInvalidException
        );
        await expect(domain.validateInviteToken('good')).resolves.toBe(invite);
    });

    it('resolves sign-up without a token to a personal workspace', async () => {
        const personal = {
            type: EnumUserSignUpWorkspaceContextType.personal as const,
            workspaceId: 'personal-id',
            name: 'Personal',
            slugCandidates: ['slug'],
        };
        onboardingDomain.buildPersonalWorkspaceContexts.mockReturnValue([
            personal,
        ]);
        await expect(
            domain.resolveForSignUp(null, 'email@example.com', 'user')
        ).resolves.toBe(personal);
    });

    it.each([
        [null, 'invitee@example.com'],
        [invite, 'wrong@example.com'],
    ])('rejects an invalid sign-up invitation', async (row, email) => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue(row);
        await expect(
            domain.resolveForSignUp('token', email, 'user')
        ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
    });

    it('resolves a matching sign-up invitation case-insensitively', async () => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue(invite);
        await expect(
            domain.resolveForSignUp('token', invite.email.toUpperCase(), 'user')
        ).resolves.toEqual({
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            invitedByUserId: invite.invitedByUserId,
            workspaceMemberRole: invite.workspaceRole,
            projectId: invite.projectId,
            projectMemberRole: invite.projectRole,
        });
    });

    it('normalizes an invitation without a project for sign-up', async () => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue({
            ...invite,
            projectId: null,
            projectRole: null,
        });

        await expect(
            domain.resolveForSignUp('token', invite.email, 'user')
        ).resolves.toEqual(
            expect.objectContaining({
                projectId: null,
                projectMemberRole: null,
            })
        );
    });

    it('expires stale invitations and lists invitations', async () => {
        const pagination = { cursor: null, perPage: 10 } as never;
        const result = { data: [], pagination: {} } as never;
        inviteRepository.expireStalePending.mockResolvedValue(3);
        inviteRepository.findWithPaginationCursor.mockResolvedValue(result);
        await expect(domain.expireStalePending()).resolves.toBe(3);
        await expect(
            domain.getInvitesList(workspace.id, pagination, {
                status: { in: [EnumWorkspaceInviteStatus.pending] },
            } as never)
        ).resolves.toBe(result);
    });

    it.each([
        [{ ...create, projectRole: undefined }],
        [{ ...create, projectId: undefined }],
    ])('requires project and project role together', async data => {
        await expect(
            domain.createInvite(workspace, 'actor-id', data)
        ).rejects.toBeInstanceOf(WorkspaceInviteRoleRequiredException);
    });

    it('rejects a project outside the workspace', async () => {
        projectDomain.getActiveByIdAndWorkspace.mockResolvedValue(null);
        inviteRepository.existsPendingByWorkspaceAndEmail.mockResolvedValue(
            false
        );
        userDomain.getOneActiveByEmail.mockResolvedValue(null);
        await expect(
            domain.createInvite(workspace, 'actor-id', create)
        ).rejects.toBeInstanceOf(WorkspaceInviteProjectMismatchException);
    });

    it('rejects a duplicate pending invitation', async () => {
        projectDomain.getActiveByIdAndWorkspace.mockResolvedValue(
            mock<Project>()
        );
        inviteRepository.existsPendingByWorkspaceAndEmail.mockResolvedValue(
            true
        );
        userDomain.getOneActiveByEmail.mockResolvedValue(null);
        await expect(
            domain.createInvite(workspace, 'actor-id', create)
        ).rejects.toBeInstanceOf(WorkspaceInviteDuplicateException);
    });

    it('creates and notifies an existing user with inviter name', async () => {
        projectDomain.getActiveByIdAndWorkspace.mockResolvedValue(
            mock<Project>()
        );
        inviteRepository.existsPendingByWorkspaceAndEmail.mockResolvedValue(
            false
        );
        userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);
        userDomain.getNameById.mockResolvedValue({
            name: 'Inviter',
            username: 'inviter',
        });
        await expect(
            domain.createInvite(workspace, 'actor-id', create)
        ).resolves.toBe(invite);
        expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
        expect(notificationQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
            existingUser.id,
            expect.objectContaining({
                inviteAcceptLink: expect.stringContaining('/claim/'),
            }),
            'actor-id'
        );
    });

    it('creates and emails an unregistered invite without a project', async () => {
        const withoutProject = {
            email: invite.email as Lowercase<string>,
            workspaceRole: invite.workspaceRole,
        };
        inviteRepository.existsPendingByWorkspaceAndEmail.mockResolvedValue(
            false
        );
        userDomain.getOneActiveByEmail.mockResolvedValue(null);
        userDomain.getNameById.mockResolvedValue(null);
        await domain.createInvite(workspace, 'actor-id', withoutProject);
        expect(activityLogDomain.prepare).toHaveBeenCalledOnce();
        expect(
            notificationEmailQueue.sendWorkspaceInviteUnregistered
        ).toHaveBeenCalledWith(
            invite.email,
            expect.objectContaining({
                inviterName: workspace.name,
                inviteAcceptLink: expect.stringContaining('/signup/'),
            })
        );
    });

    it.each([
        [null, WorkspaceInviteNotFoundException],
        [
            { ...invite, status: EnumWorkspaceInviteStatus.accepted },
            WorkspaceInviteAlreadyProcessedException,
        ],
    ])('rejects resending an unavailable invite', async (row, expected) => {
        inviteRepository.findByIdAndWorkspace.mockResolvedValue(row);
        await expect(
            domain.resendInvite(workspace, 'actor-id', invite.id)
        ).rejects.toBeInstanceOf(expected);
    });

    it('sends again with explicit expiry and inviter username', async () => {
        inviteRepository.findByIdAndWorkspace.mockResolvedValue(invite);
        userDomain.getOneActiveByEmail.mockResolvedValue(existingUser);
        userDomain.getNameById.mockResolvedValue({
            name: null,
            username: 'inviter',
        });
        await expect(
            domain.resendInvite(
                workspace,
                'actor-id',
                invite.id,
                EnumWorkspaceInviteExpiry.threeDays
            )
        ).resolves.toBe(invite);
        expect(dateService.forward).toHaveBeenCalledWith(
            now,
            expect.anything()
        );
        expect(notificationQueue.sendWorkspaceInvite).toHaveBeenCalledWith(
            existingUser.id,
            expect.objectContaining({ inviterName: 'inviter' }),
            'actor-id'
        );
    });

    it.each([
        [null, WorkspaceInviteNotFoundException],
        [
            { ...invite, status: EnumWorkspaceInviteStatus.revoked },
            WorkspaceInviteAlreadyProcessedException,
        ],
    ])('rejects revoking an unavailable invite', async (row, expected) => {
        inviteRepository.findByIdAndWorkspace.mockResolvedValue(row);
        await expect(
            domain.revokeInvite(workspace.id, 'actor-id', invite.id)
        ).rejects.toBeInstanceOf(expected);
    });

    it.each([
        [existingUser, 'actor-id', 2],
        [null, 'actor-id', 1],
        [{ ...existingUser, id: 'actor-id' }, 'actor-id', 1],
    ])(
        'revokes a pending invite and stages its audience activities',
        async (user, actorId, count) => {
            inviteRepository.findByIdAndWorkspace.mockResolvedValue(invite);
            userDomain.getOneActiveByEmail.mockResolvedValue(user);
            await domain.revokeInvite(workspace.id, actorId, invite.id);
            expect(activityLogDomain.prepare).toHaveBeenCalledTimes(count);
            expect(inviteRepository.revoke).toHaveBeenCalledWith(invite.id);
        }
    );

    it('accepts a sign-up invitation with project membership in order', async () => {
        await domain.acceptOnSignUpInTx(tx, 'user-id', {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            invitedByUserId: invite.invitedByUserId,
            workspaceMemberRole: invite.workspaceRole,
            projectId: invite.projectId,
            projectMemberRole: invite.projectRole,
        });
        expect(inviteRepository.acceptInTx).toHaveBeenCalledAfter(
            memberDomain.createInTx
        );
        expect(projectMemberDomain.createInTx).toHaveBeenCalledAfter(
            inviteRepository.acceptInTx
        );
    });

    it('accepts a sign-up invitation without project membership', async () => {
        await domain.acceptOnSignUpInTx(tx, 'user-id', {
            type: EnumUserSignUpWorkspaceContextType.invite,
            workspaceId: invite.workspaceId,
            workspaceInviteId: invite.id,
            invitedByUserId: null,
            workspaceMemberRole: invite.workspaceRole,
            projectId: null,
            projectMemberRole: null,
        });
        expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
    });

    it('rejects claiming an invitation for a different email', async () => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue(invite);
        await expect(
            domain.claimInvite('user-id', 'wrong@example.com', 'token')
        ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
    });

    it('rejects claiming when the user is already a member', async () => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue(invite);
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(mock());
        await expect(
            domain.claimInvite('user-id', invite.email, 'token')
        ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
    });

    it('claims a project invitation in a transaction and stages both activities', async () => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue(invite);
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(null);
        await domain.claimInvite(
            'user-id',
            invite.email.toUpperCase(),
            'token'
        );
        expect(memberDomain.createInTx).toHaveBeenCalledBefore(
            inviteRepository.acceptInTx
        );
        expect(userDomain.setLastWorkspaceInTx).toHaveBeenCalledAfter(
            inviteRepository.acceptInTx
        );
        expect(projectMemberDomain.createInTx).toHaveBeenCalledAfter(
            userDomain.setLastWorkspaceInTx
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledTimes(2);
    });

    it('claims an invitation without inviter or project', async () => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue({
            ...invite,
            invitedByUserId: null,
            projectId: null,
            projectRole: null,
        });
        memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(null);
        await domain.claimInvite('user-id', invite.email, 'token');
        expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        expect(activityLogDomain.prepare).toHaveBeenCalledOnce();
    });

    it('rejects preview when the invite workspace is unavailable', async () => {
        inviteRepository.findPendingByHashedToken.mockResolvedValue(invite);
        workspaceRepository.findActiveById.mockResolvedValue(null);
        await expect(domain.previewInvite('token')).rejects.toBeInstanceOf(
            WorkspaceInviteInvalidException
        );
    });

    it('previews invitations with and without an inviter', async () => {
        inviteRepository.findPendingByHashedToken
            .mockResolvedValueOnce(invite)
            .mockResolvedValueOnce({ ...invite, invitedByUserId: null });
        workspaceRepository.findActiveById.mockResolvedValue(workspace);
        userDomain.getNameById.mockResolvedValue({
            name: 'Inviter',
            username: 'inviter',
        });
        await expect(domain.previewInvite('token')).resolves.toEqual({
            workspace,
            invite,
            inviter: { name: 'Inviter', username: 'inviter' },
        });
        await expect(domain.previewInvite('token')).resolves.toEqual({
            workspace,
            invite: { ...invite, invitedByUserId: null },
            inviter: null,
        });
    });
});
