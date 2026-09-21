import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';

import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumTermPolicyType,
    EnumWorkspaceMemberRole,
    type Workspace,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import { WorkspaceInviteRepository } from '@modules/workspace/repositories/workspace.invite.repository';
import { WorkspaceJoinRequestRepository } from '@modules/workspace/repositories/workspace.join-request.repository';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';

const now = new Date('2026-01-01T00:00:00.000Z');
const workspace: Workspace = {
    id: 'workspace-id',
    name: 'Workspace',
    slug: 'workspace',
    description: null,
    isPublic: true,
    createdAt: now,
    createdBy: null,
    updatedAt: now,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
};

vi.mock('@common/sentry/services/sentry.service', () => ({
    SentryService: class {},
}));

describe('WorkspaceDomain', () => {
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const workspaceMemberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceInviteRepository: MockProxy<WorkspaceInviteRepository> =
        mock<WorkspaceInviteRepository>();
    const workspaceJoinRequestRepository: MockProxy<WorkspaceJoinRequestRepository> =
        mock<WorkspaceJoinRequestRepository>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const projectDomain: MockProxy<ProjectDomain> = mock<ProjectDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const userOnboardingUtil: MockProxy<UserOnboardingUtil> =
        mock<UserOnboardingUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const termPolicyAcceptanceDomain: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const tx = {} as IDatabaseTransactionClient;
    const personalInput: IUserCreateWithWorkspaceInput =
        mock<IUserCreateWithWorkspaceInput>({
            userId: 'personal-user-id',
            createdBy: 'creator-id',
            password: {
                passwordHash: 'hash',
                passwordPeriodExpired: now,
                passwordCreated: now,
            },
            passwordHistoryType: EnumPasswordHistoryType.admin,
            verification: {} as never,
            acceptedTermPolicyTypes: [EnumTermPolicyType.privacy],
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId: 'personal-workspace-id',
                name: 'Personal',
                slugCandidates: ['personal-1', 'personal-2'],
            },
        });
    const inviteInput: IUserCreateWithWorkspaceInput =
        mock<IUserCreateWithWorkspaceInput>({
            userId: 'invite-user-id',
            createdBy: 'creator-id',
            password: null,
            passwordHistoryType: null,
            verification: null,
            acceptedTermPolicyTypes: [],
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: workspace.id,
                workspaceInviteId: 'invite-id',
                invitedByUserId: 'inviter-id',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: 'project-id',
                projectMemberRole: EnumProjectMemberRole.member,
            },
        });

    let domain: WorkspaceDomain;

    beforeEach(async () => {
        vi.mocked(configService.get).mockImplementation((key: string) => {
            if (key === 'workspace.maxWorkspacesPerUser') return 2;
            if (key === 'workspace.slugRegex') return /^[a-z0-9-]+$/;
            if (key === 'workspace.slugPrefix') return 'ws';
            if (key === 'workspace.slugMaxLength') return 16;
            if (key === 'workspace.slugMaxAttempts') return 2;
            return undefined;
        });
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(tx)
        );
        databaseUtil.createId.mockReturnValue('new-workspace-id');
        databaseUtil.isUniqueCollision.mockReturnValue(false);
        helperDateService.create.mockReturnValue(now);
        helperStringService.generateSlug
            .mockReturnValueOnce('ws-one')
            .mockReturnValueOnce('ws-two');
        workspaceRepository.createInTx.mockResolvedValue(workspace);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceDomain,
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                {
                    provide: WorkspaceMemberRepository,
                    useValue: workspaceMemberRepository,
                },
                {
                    provide: WorkspaceInviteRepository,
                    useValue: workspaceInviteRepository,
                },
                {
                    provide: WorkspaceJoinRequestRepository,
                    useValue: workspaceJoinRequestRepository,
                },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: ProjectDomain, useValue: projectDomain },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                { provide: UserTwoFactorDomain, useValue: userTwoFactorDomain },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: NotificationDomain, useValue: notificationDomain },
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: ConfigService, useValue: configService },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
            ],
        }).compile();
        domain = module.get(WorkspaceDomain);
    });

    it.each([null, 'missing'])(
        'rejects an unavailable workspace guard',
        async id => {
            workspaceRepository.findActiveById.mockResolvedValue(null);
            await expect(
                domain.validateWorkspaceGuard(id)
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        }
    );

    it('validates and lists workspaces', async () => {
        const pagination = { cursor: null, perPage: 10 } as never;
        const result = { data: [workspace], pagination: {} } as never;
        workspaceRepository.findActiveById.mockResolvedValue(workspace);
        workspaceRepository.findWithPaginationCursorByMember.mockResolvedValue(
            result
        );
        await expect(domain.validateWorkspaceGuard(workspace.id)).resolves.toBe(
            workspace
        );
        await expect(
            domain.getListForMember('user-id', pagination)
        ).resolves.toBe(result);
    });

    it('creates a workspace and owner in transaction order', async () => {
        await expect(
            domain.createInTx(tx, 'owner-id', { name: 'Name' }, 'slug', 'id')
        ).resolves.toBe(workspace);
        expect(workspaceRepository.createInTx).toHaveBeenCalledWith(
            tx,
            'owner-id',
            { name: 'Name' },
            'slug',
            'id'
        );
        expect(workspaceMemberRepository.createOwnerInTx).toHaveBeenCalledAfter(
            workspaceRepository.createInTx
        );
    });

    it('creates personal and owned-user workspaces', async () => {
        await domain.createPersonalInTx(tx, 'owner-id', 'Name', 'slug', 'id');
        await domain.createOwnedForUsersInTx(tx, [
            { userId: 'a', workspaceId: 'wa', name: 'A', slug: 'a' },
            { userId: 'b', workspaceId: 'wb', name: 'B', slug: 'b' },
        ]);
        expect(workspaceRepository.createInTx).toHaveBeenCalledTimes(3);
    });

    it('commits mixed onboarding and stages prepared activities', async () => {
        const users = [
            mock<IUser>({ id: personalInput.userId }),
            mock<IUser>({ id: inviteInput.userId }),
        ];
        userOnboardingDomain.createManyInTx.mockResolvedValue(users);
        userTwoFactorDomain.createDisabledInTx.mockResolvedValue(mock());
        userOnboardingDomain.buildAdminPayloadMetadata.mockReturnValue(
            {} as never
        );
        userOnboardingDomain.buildOnboardingActivities.mockReturnValue([
            {
                action: EnumActivityLogAction.userCreated,
                userId: 'user-id',
                createdBy: 'creator-id',
                workspaceId: workspace.id,
                metadata: {},
            },
        ]);

        await expect(
            domain.commitOnboarding(
                [personalInput, inviteInput],
                EnumUserCreateMode.admin,
                1000,
                EnumActivityLogAction.adminUserCreate
            )
        ).resolves.toEqual([
            expect.objectContaining({ id: personalInput.userId }),
            expect.objectContaining({ id: inviteInput.userId }),
        ]);
        expect(passwordHistoryDomain.createInTx).toHaveBeenCalledOnce();
        expect(notificationDomain.createDefaultsInTx).toHaveBeenCalledTimes(2);
        expect(
            userVerificationDomain.createFromOnboardingInTx
        ).toHaveBeenCalledOnce();
        expect(workspaceInviteDomain.acceptOnSignUpInTx).toHaveBeenCalledOnce();
        expect(
            termPolicyAcceptanceDomain.acceptPublishedInTx
        ).toHaveBeenCalledTimes(2);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it('uses one onboarding attempt when no personal workspace exists', async () => {
        userOnboardingDomain.createManyInTx.mockResolvedValue([mock<IUser>()]);
        userTwoFactorDomain.createDisabledInTx.mockResolvedValue(mock());
        userOnboardingDomain.buildOnboardingActivities.mockReturnValue([]);
        await domain.commitOnboarding(
            [inviteInput],
            EnumUserCreateMode.signUp,
            1000
        );
        expect(databaseService.withTransaction).toHaveBeenCalledOnce();
    });

    it('retries onboarding slug collisions and uses the next candidate', async () => {
        databaseService.withTransaction
            .mockRejectedValueOnce(new Error('collision'))
            .mockImplementationOnce(async callback => callback(tx));
        databaseUtil.isUniqueCollision.mockReturnValueOnce(true);
        userOnboardingDomain.createManyInTx.mockResolvedValue([mock<IUser>()]);
        userTwoFactorDomain.createDisabledInTx.mockResolvedValue(mock());
        userOnboardingDomain.buildOnboardingActivities.mockReturnValue([]);
        await domain.commitOnboarding(
            [personalInput],
            EnumUserCreateMode.signUp,
            1000
        );
        expect(workspaceRepository.createInTx).toHaveBeenLastCalledWith(
            tx,
            personalInput.userId,
            { name: 'Personal' },
            'personal-2',
            'personal-workspace-id'
        );
    });

    it('maps a non-slug onboarding collision', async () => {
        const failure = new Error('failure');
        const mapped = new Error('mapped');
        databaseService.withTransaction.mockRejectedValue(failure);
        databaseUtil.isUniqueCollision.mockReturnValue(false);
        userOnboardingUtil.mapCreateCollision.mockReturnValue(mapped);
        await expect(
            domain.commitOnboarding(
                [personalInput],
                EnumUserCreateMode.signUp,
                1000
            )
        ).rejects.toBe(mapped);
    });

    it('fails after exhausting onboarding slug candidates', async () => {
        databaseService.withTransaction.mockRejectedValue(
            new Error('collision')
        );
        databaseUtil.isUniqueCollision.mockReturnValue(true);
        await expect(
            domain.commitOnboarding(
                [personalInput],
                EnumUserCreateMode.signUp,
                1000
            )
        ).rejects.toBeInstanceOf(DatabaseUniqueValueGenerationFailedException);
    });

    it('rejects workspace creation at the ownership cap', async () => {
        workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(2);
        await expect(
            domain.createWorkspace('user-id', { name: 'Name' })
        ).rejects.toBeInstanceOf(WorkspaceCapReachedException);
    });

    it('retries a slug collision and creates a workspace', async () => {
        workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(0);
        databaseService.withTransaction
            .mockRejectedValueOnce(new Error('collision'))
            .mockImplementationOnce(async callback => callback(tx));
        databaseUtil.isUniqueCollision
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);
        await expect(
            domain.createWorkspace('user-id', { name: 'Name' })
        ).resolves.toBe(workspace);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it('preserves non-slug workspace creation failures', async () => {
        const failure = new Error('failure');
        workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(0);
        databaseService.withTransaction.mockRejectedValue(failure);
        await expect(
            domain.createWorkspace('user-id', { name: 'Name' })
        ).rejects.toBe(failure);
    });

    it('fails after exhausting workspace slug candidates', async () => {
        workspaceMemberRepository.countOwnedActiveByUser.mockResolvedValue(0);
        databaseService.withTransaction.mockRejectedValue(
            new Error('collision')
        );
        databaseUtil.isUniqueCollision.mockReturnValue(true);
        await expect(
            domain.createWorkspace('user-id', { name: 'Name' })
        ).rejects.toBeInstanceOf(DatabaseUniqueValueGenerationFailedException);
    });

    it('returns and updates current workspace details and visibility', async () => {
        workspaceRepository.updateDetails.mockResolvedValue(workspace);
        workspaceRepository.updateIsPublic.mockResolvedValue(workspace);
        expect(domain.getCurrentWorkspace(workspace)).toBe(workspace);
        await expect(
            domain.updateWorkspace(workspace.id, 'actor-id', { name: 'New' })
        ).resolves.toBe(workspace);
        await expect(
            domain.updateWorkspaceIsPublic(workspace.id, 'actor-id', true)
        ).resolves.toBe(workspace);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(2);
    });

    it.each(['INVALID!', 'this-slug-is-far-too-long'])(
        'rejects an invalid slug',
        async slug => {
            await expect(
                domain.updateWorkspaceSlug(workspace.id, 'actor-id', slug)
            ).rejects.toBeInstanceOf(WorkspaceSlugInvalidException);
        }
    );

    it('rejects a taken valid slug', async () => {
        workspaceRepository.existsBySlug.mockResolvedValue(true);
        await expect(
            domain.updateWorkspaceSlug(workspace.id, 'actor-id', 'valid-slug')
        ).rejects.toBeInstanceOf(WorkspaceSlugAlreadyExistsException);
    });

    it('updates an available slug', async () => {
        workspaceRepository.existsBySlug.mockResolvedValue(false);
        workspaceRepository.updateSlug.mockResolvedValue(workspace);
        await expect(
            domain.updateWorkspaceSlug(workspace.id, 'actor-id', 'valid-slug')
        ).resolves.toBe(workspace);
    });

    it('switches the current workspace after validating membership', async () => {
        workspaceRepository.findActiveById.mockResolvedValue(workspace);
        await domain.switchWorkspace('user-id', workspace.id);
        expect(
            workspaceMemberDomain.validateWorkspaceMemberGuard
        ).toHaveBeenCalledWith(workspace.id, 'user-id');
        expect(userDomain.setLastWorkspace).toHaveBeenCalledWith(
            'user-id',
            workspace.id
        );
    });

    it('soft-deletes a workspace and dependent rows in a transaction', async () => {
        await domain.softDeleteWorkspace(workspace.id, 'actor-id');
        expect(projectDomain.softDeleteByWorkspaceInTx).toHaveBeenCalledAfter(
            workspaceRepository.softDeleteInTx
        );
        expect(
            workspaceInviteRepository.expirePendingByWorkspaceInTx
        ).toHaveBeenCalledAfter(projectDomain.softDeleteByWorkspaceInTx);
        expect(
            workspaceJoinRequestRepository.cancelPendingByWorkspaceInTx
        ).toHaveBeenCalledAfter(
            workspaceInviteRepository.expirePendingByWorkspaceInTx
        );
    });

    it('lists and reads workspaces for administrators', async () => {
        const pagination = { page: 1, perPage: 10 } as never;
        const result = { data: [workspace], pagination: {} } as never;
        workspaceRepository.findWithPaginationOffsetForAdmin.mockResolvedValue(
            result
        );
        workspaceRepository.findByIdForAdmin.mockResolvedValue(workspace);
        await expect(
            domain.getListForAdmin(pagination, {
                public: { equal: true },
            } as never)
        ).resolves.toBe(result);
        await expect(domain.getByIdForAdmin(workspace.id)).resolves.toBe(
            workspace
        );
    });

    it('rejects an unknown workspace administrator read', async () => {
        workspaceRepository.findByIdForAdmin.mockResolvedValue(null);
        await expect(domain.getByIdForAdmin('missing')).rejects.toBeInstanceOf(
            WorkspaceNotFoundException
        );
    });

    it('previews a public workspace after checking the feature flag', async () => {
        workspaceRepository.findActivePublicBySlug.mockResolvedValue(workspace);
        await expect(domain.previewWorkspace(workspace.slug)).resolves.toBe(
            workspace
        );
        expect(
            featureFlagDomain.validateFeatureFlagMetadata
        ).toHaveBeenCalledWith('workspace', 'joinRequestAllowed');
    });

    it('hides an unavailable public workspace', async () => {
        workspaceRepository.findActivePublicBySlug.mockResolvedValue(null);
        await expect(domain.previewWorkspace('missing')).rejects.toBeInstanceOf(
            WorkspaceNotFoundException
        );
    });
});
