import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';

describe('UserOnboardingDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configGet = vi.fn<(key: string) => number | string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserOnboardingDomain;

    const configValues: Record<string, number | string> = {
        'workspace.personalNamePattern': "{username}'s Workspace",
        'workspace.slugPrefix': 'w-',
        'workspace.slugMaxLength': 30,
        'workspace.slugMaxAttempts': 3,
        'user.onboarding.createTimeoutInMs': 10000,
        'user.onboarding.createBulkTimeoutInMs': 30000,
    };

    const role: IRoleWithPolicies = {
        id: 'role-harbor',
        name: 'user',
        description: null,
        type: EnumRoleType.user,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-harbor',
        userId: 'user-harbor',
        secret: null,
        pendingSecret: null,
        backupCodes: [],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const user: IUser = {
        id: 'user-harbor',
        name: 'Harbor Quill',
        username: 'harborFinch',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'harbor@example.com',
        roleId: 'role-harbor',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-harbor',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role,
        twoFactor,
    };

    const personalContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-harbor',
        slugCandidates: ['w-harbor'],
        name: "harborFinch's Workspace",
    };

    const personalInput: IUserCreateWithWorkspaceInput = {
        userId: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        countryId: user.countryId,
        roleId: role.id,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: true,
        termPolicy: {
            [EnumTermPolicyType.cookies]: false,
            [EnumTermPolicyType.marketing]: false,
            [EnumTermPolicyType.privacy]: true,
            [EnumTermPolicyType.termsOfService]: true,
        },
        acceptedTermPolicyTypes: [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
        ],
        password: null,
        passwordHistoryType: null,
        verification: null,
        workspaceContext: personalContext,
        createdBy: user.id,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserOnboardingDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        domain = module.get(UserOnboardingDomain);
    });

    describe('getCreateTimeoutInMs', () => {
        it('returns the configured onboarding create timeout', () => {
            expect(domain.getCreateTimeoutInMs()).toBe(10000);
        });
    });

    describe('getCreateBulkTimeoutInMs', () => {
        it('returns the configured onboarding bulk create timeout', () => {
            expect(domain.getCreateBulkTimeoutInMs()).toBe(30000);
        });
    });

    describe('buildPersonalWorkspaceContexts', () => {
        it('builds one personal workspace context per username', () => {
            databaseUtil.createId
                .mockReturnValueOnce('workspace-one')
                .mockReturnValueOnce('workspace-two');
            helperStringService.generateSlug
                .mockReturnValueOnce('w-one-a')
                .mockReturnValueOnce('w-one-b')
                .mockReturnValueOnce('w-one-c')
                .mockReturnValueOnce('w-two-a')
                .mockReturnValueOnce('w-two-b')
                .mockReturnValueOnce('w-two-c');

            const result = domain.buildPersonalWorkspaceContexts([
                'harborFinch',
                'marigoldFinch',
            ]);

            expect(result).toEqual([
                {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-one',
                    slugCandidates: ['w-one-a', 'w-one-b', 'w-one-c'],
                    name: "harborFinch's Workspace",
                },
                {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-two',
                    slugCandidates: ['w-two-a', 'w-two-b', 'w-two-c'],
                    name: "marigoldFinch's Workspace",
                },
            ]);
            expect(helperStringService.generateSlug).toHaveBeenCalledWith(
                'w-',
                30
            );
        });
    });

    describe('buildOnboardingActivities', () => {
        it('builds a sign-up personal onboarding activity set with no acting admin', () => {
            const input = personalInput;

            const result = domain.buildOnboardingActivities(
                EnumUserCreateMode.signUp,
                input,
                user
            );

            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.userSignedUp,
                    userId: user.id,
                    workspaceId: null,
                    createdBy: user.id,
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.userSendVerificationEmail,
                    userId: user.id,
                    workspaceId: null,
                    createdBy: user.id,
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.workspaceCreated,
                    userId: user.id,
                    workspaceId: personalContext.workspaceId,
                    createdBy: user.id,
                    metadata: {},
                },
            ]);
        });

        it('builds an admin personal onboarding activity set naming the acting admin', () => {
            const input = { ...personalInput, createdBy: 'admin-harbor' };

            const result = domain.buildOnboardingActivities(
                EnumUserCreateMode.admin,
                input,
                user
            );

            expect(result).toEqual([
                {
                    action: UserCreateContract[EnumUserCreateMode.admin]
                        .createdAction,
                    userId: user.id,
                    workspaceId: null,
                    createdBy: 'admin-harbor',
                    metadata: {
                        actorUserId: 'admin-harbor',
                        timestamp: user.createdAt,
                    },
                },
                {
                    action: EnumActivityLogAction.userSendVerificationEmail,
                    userId: user.id,
                    workspaceId: null,
                    createdBy: 'admin-harbor',
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.workspaceCreatedByAdmin,
                    userId: user.id,
                    workspaceId: personalContext.workspaceId,
                    createdBy: 'admin-harbor',
                    metadata: { actorUserId: 'admin-harbor' },
                },
            ]);
        });

        it('builds an invite onboarding activity set, skipping the verification email request and adding the inviter row', () => {
            const inviteContext: IUserSignUpWorkspaceInvite = {
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: 'workspace-harbor',
                workspaceInviteId: 'invite-harbor',
                invitedByUserId: 'inviter-harbor',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: null,
                projectMemberRole: null,
            };
            const input = { ...personalInput, workspaceContext: inviteContext };

            const result = domain.buildOnboardingActivities(
                EnumUserCreateMode.social,
                input,
                user
            );

            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.userCreated,
                    userId: user.id,
                    workspaceId: null,
                    createdBy: user.id,
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.workspaceInviteAccepted,
                    userId: user.id,
                    workspaceId: inviteContext.workspaceId,
                    createdBy: user.id,
                    metadata: { targetUserId: 'inviter-harbor' },
                },
                {
                    action: EnumActivityLogAction.workspaceInviteAcceptedByInvitee,
                    userId: 'inviter-harbor',
                    workspaceId: inviteContext.workspaceId,
                    createdBy: user.id,
                    metadata: { actorUserId: user.id },
                },
            ]);
        });

        it('builds an invite onboarding activity set with no inviter row when the inviter is the new user', () => {
            const inviteContext: IUserSignUpWorkspaceInvite = {
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: 'workspace-harbor',
                workspaceInviteId: 'invite-harbor',
                invitedByUserId: user.id,
                workspaceMemberRole: EnumWorkspaceMemberRole.admin,
                projectId: 'project-harbor',
                projectMemberRole: EnumProjectMemberRole.admin,
            };
            const input = { ...personalInput, workspaceContext: inviteContext };

            const result = domain.buildOnboardingActivities(
                EnumUserCreateMode.social,
                input,
                user
            );

            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.userCreated,
                    userId: user.id,
                    workspaceId: null,
                    createdBy: user.id,
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.workspaceInviteAccepted,
                    userId: user.id,
                    workspaceId: inviteContext.workspaceId,
                    createdBy: user.id,
                    metadata: { targetUserId: user.id },
                },
            ]);
        });
    });

    describe('buildAdminPayloadMetadata', () => {
        it('maps adminUserCreate metadata from the first user', () => {
            const result = domain.buildAdminPayloadMetadata(
                EnumActivityLogAction.adminUserCreate,
                [user]
            );

            expect(result).toEqual({
                targetUserId: user.id,
                targetUsername: user.username,
                timestamp: user.createdAt,
            });
        });

        it('maps adminUserImport metadata from the user count', () => {
            const result = domain.buildAdminPayloadMetadata(
                EnumActivityLogAction.adminUserImport,
                [user, { ...user, id: 'user-second' }]
            );

            expect(result).toEqual({ userCount: 2 });
        });
    });

    describe('createManyInTx', () => {
        it('delegates to the repository', async () => {
            const tx = {} as IDatabaseTransactionClient;
            const inputs = [personalInput];
            userRepository.createManyInTx.mockResolvedValue([user]);

            await expect(domain.createManyInTx(tx, inputs)).resolves.toEqual([
                user,
            ]);
            expect(userRepository.createManyInTx).toHaveBeenCalledWith(
                tx,
                inputs
            );
        });
    });

    describe('drawWorkspaceSlugCandidates', () => {
        it('draws one slug per configured max attempt', () => {
            helperStringService.generateSlug
                .mockReturnValueOnce('w-first')
                .mockReturnValueOnce('w-second')
                .mockReturnValueOnce('w-third');

            const result = domain['drawWorkspaceSlugCandidates']();

            expect(result).toEqual(['w-first', 'w-second', 'w-third']);
            expect(helperStringService.generateSlug).toHaveBeenCalledTimes(3);
        });
    });
});
