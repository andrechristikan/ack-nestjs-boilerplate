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
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    TwoFactor,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('UserOnboardingUtil', () => {
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let util: UserOnboardingUtil;

    const configValues: Record<string, number | string> = {
        'workspace.personalNamePattern': "{username}'s Workspace",
        'workspace.slugPrefix': 'w-',
        'workspace.slugMaxLength': 30,
        'workspace.slugMaxAttempts': 3,
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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserOnboardingUtil,
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        util = module.get(UserOnboardingUtil);
    });

    describe('buildPersonalWorkspaceContexts', () => {
        it('builds one personal workspace context per username', () => {
            databaseUtil.createId
                .mockReturnValueOnce('workspace-one')
                .mockReturnValueOnce('workspace-two');
            helperStringService.generateSlugCandidates
                .mockReturnValueOnce(['w-one-a', 'w-one-b', 'w-one-c'])
                .mockReturnValueOnce(['w-two-a', 'w-two-b', 'w-two-c']);

            const result = util.buildPersonalWorkspaceContexts([
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
            expect(
                helperStringService.generateSlugCandidates
            ).toHaveBeenCalledWith('w-', 30, 3);
        });
    });

    describe('buildInviteWorkspaceContext', () => {
        it('maps a pending invite onto the invite sign-up context', () => {
            const invite: WorkspaceInvite = {
                id: 'invite-harbor',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: 'inviter-harbor',
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: 'inviter-harbor',
                workspaceId: 'workspace-harbor',
                email: 'harbor@example.com',
                token: 'hashed-token',
                workspaceRole: EnumWorkspaceMemberRole.member,
                projectId: 'project-harbor',
                projectRole: EnumProjectMemberRole.admin,
                reference: 'WIN-harbor',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                status: EnumWorkspaceInviteStatus.pending,
                invitedByUserId: 'inviter-harbor',
                acceptedAt: null,
                acceptedByUserId: null,
            };

            expect(util.buildInviteWorkspaceContext(invite)).toEqual({
                type: EnumUserSignUpWorkspaceContextType.invite,
                workspaceId: 'workspace-harbor',
                workspaceInviteId: 'invite-harbor',
                invitedByUserId: 'inviter-harbor',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: 'project-harbor',
                projectMemberRole: EnumProjectMemberRole.admin,
            });
        });

        it('maps an invite with no project onto null project fields', () => {
            const invite: WorkspaceInvite = {
                id: 'invite-harbor',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: 'inviter-harbor',
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: 'inviter-harbor',
                workspaceId: 'workspace-harbor',
                email: 'harbor@example.com',
                token: 'hashed-token',
                workspaceRole: EnumWorkspaceMemberRole.admin,
                projectId: null,
                projectRole: null,
                reference: 'WIN-harbor',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                status: EnumWorkspaceInviteStatus.pending,
                invitedByUserId: 'inviter-harbor',
                acceptedAt: null,
                acceptedByUserId: null,
            };

            expect(util.buildInviteWorkspaceContext(invite)).toMatchObject({
                projectId: null,
                projectMemberRole: null,
            });
        });
    });

    describe('buildOnboardingActivities', () => {
        it('builds a sign-up personal onboarding activity set with no acting admin', () => {
            const input = personalInput;

            const result = util.buildOnboardingActivities(
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

            const result = util.buildOnboardingActivities(
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

            const result = util.buildOnboardingActivities(
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

            const result = util.buildOnboardingActivities(
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
            const result = util.buildAdminPayloadMetadata(
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
            const result = util.buildAdminPayloadMetadata(
                EnumActivityLogAction.adminUserImport,
                [user, { ...user, id: 'user-second' }]
            );

            expect(result).toEqual({ userCount: 2 });
        });
    });

    describe('buildActivityStages', () => {
        it('builds the stage inputs of every input, omitting a null workspace id', () => {
            const result = util.buildActivityStages(
                EnumUserCreateMode.signUp,
                [personalInput],
                [user],
                null
            );

            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.userSignedUp,
                    userId: user.id,
                    createdBy: user.id,
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.userSendVerificationEmail,
                    userId: user.id,
                    createdBy: user.id,
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.workspaceCreated,
                    userId: user.id,
                    createdBy: user.id,
                    workspaceId: personalContext.workspaceId,
                    metadata: {},
                },
            ]);
        });

        it('leads with the admin payload stage input when an admin action is given', () => {
            const result = util.buildActivityStages(
                EnumUserCreateMode.admin,
                [personalInput],
                [user],
                EnumActivityLogAction.adminUserImport
            );

            expect(result[0]).toEqual({
                action: EnumActivityLogAction.adminUserImport,
                metadata: { userCount: 1 },
            });
            expect(result).toHaveLength(4);
        });
    });

    describe('mapCreateCollision', () => {
        it('returns UserUsernameExistException when the collision is on username', () => {
            const error = new Error('collision');
            databaseUtil.isUniqueCollision.mockImplementation(
                (_err, field) => field === 'username'
            );

            const result = util.mapCreateCollision(error);

            expect(result).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                error,
                'username'
            );
        });

        it('returns UserEmailExistException when the collision is on email', () => {
            const error = new Error('collision');
            databaseUtil.isUniqueCollision.mockImplementation(
                (_err, field) => field === 'email'
            );

            const result = util.mapCreateCollision(error);

            expect(result).toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                error,
                'email'
            );
        });

        it('returns the error untouched when it is neither collision', () => {
            const error = new Error('unrelated');
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            const result = util.mapCreateCollision(error);

            expect(result).toBe(error);
        });
    });
});
