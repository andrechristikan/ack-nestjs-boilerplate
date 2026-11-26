import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { WorkspaceInvite } from '@generated/prisma-client/client';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserCreateWorkspaceInvite,
    IUserCreateWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

describe('UserCreateUtil', () => {
    let databaseUtil: DatabaseUtil;
    let helperStringService: HelperStringService;

    let util: UserCreateUtil;

    const configValues: Record<string, number | string> = {
        ...TestUnitKitConfigValues,
        'workspace.personalNamePattern': "{username}'s workspace",
        'workspace.slugPrefix': 'w-',
        'workspace.slugMaxLength': 30,
        'workspace.slugMaxAttempts': 3,
    };

    const role: IRoleWithPolicies = {
        id: 'role-harbor',
        name: 'user',
        description: null,
        type: EnumRoleType.user,
        isImmutable: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };
    const user: IUser = buildUser('user-harbor', 'harbor@example.com');

    const personalContext: IUserCreateWorkspacePersonal = {
        type: EnumUserCreateWorkspaceContextType.personal,
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
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        acceptedTermPolicyTypes: [
            EnumTermPolicyType.termsOfService,
            EnumTermPolicyType.privacy,
        ],
        password: null,
        passwordHistoryType: null,
        verification: null,
        login: null,
        workspaceContext: personalContext,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: user.id,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCreateUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        util = module.get(UserCreateUtil);
        databaseUtil = module.get(DatabaseUtil);
        helperStringService = module.get(HelperStringService);
    });

    describe('buildPersonalWorkspaceContexts', () => {
        it('builds one personal workspace context per username', () => {
            vi.spyOn(databaseUtil, 'createId')
                .mockReturnValueOnce('workspace-one')
                .mockReturnValueOnce('workspace-two');
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValueOnce('one-a')
                .mockReturnValueOnce('one-b')
                .mockReturnValueOnce('one-c')
                .mockReturnValueOnce('two-a')
                .mockReturnValueOnce('two-b')
                .mockReturnValueOnce('two-c');

            const result = util.buildPersonalWorkspaceContexts([
                'harborFinch',
                'marigoldFinch',
            ]);

            expect(result).toEqual([
                {
                    type: EnumUserCreateWorkspaceContextType.personal,
                    workspaceId: 'workspace-one',
                    slugCandidates: ['w-one-a', 'w-one-b', 'w-one-c'],
                    name: "harborFinch's workspace",
                },
                {
                    type: EnumUserCreateWorkspaceContextType.personal,
                    workspaceId: 'workspace-two',
                    slugCandidates: ['w-two-a', 'w-two-b', 'w-two-c'],
                    name: "marigoldFinch's workspace",
                },
            ]);
            expect(random).toHaveBeenCalledTimes(6);
            expect(random).toHaveBeenCalledWith(28);
        });
    });

    describe('buildSignUpWorkspaceContext', () => {
        it('builds the personal workspace context of the username when the sign-up carries no invite', () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValueOnce(
                'workspace-one'
            );
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('one-a')
                .mockReturnValueOnce('one-b')
                .mockReturnValueOnce('one-c');

            const result = util.buildSignUpWorkspaceContext(
                null,
                'harborFinch'
            );

            expect(result).toEqual({
                type: EnumUserCreateWorkspaceContextType.personal,
                workspaceId: 'workspace-one',
                slugCandidates: ['w-one-a', 'w-one-b', 'w-one-c'],
                name: "harborFinch's workspace",
            });
        });

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
                nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            };

            const result = util.buildSignUpWorkspaceContext(
                invite,
                'harborFinch'
            );

            expect(result).toEqual({
                type: EnumUserCreateWorkspaceContextType.invite,
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
                nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            };

            const result = util.buildSignUpWorkspaceContext(
                invite,
                'harborFinch'
            );

            expect(result).toMatchObject({
                projectId: null,
                projectMemberRole: null,
            });
        });
    });

    describe('buildStages', () => {
        it('builds the stage inputs of every input, omitting a null workspace id', () => {
            const result = util.buildStages(UserCreateContract.signUp, [
                personalInput,
            ]);

            expect(result).toEqual([
                {
                    action: EnumActivityLogAction.userSignedUp,
                    userId: user.id,
                    createdBy: user.id,
                    metadata: {},
                },
                {
                    action: EnumActivityLogAction.userVerificationEmailSent,
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

        it('reads the created timestamp from each input', () => {
            const second: IUserCreateWithWorkspaceInput = {
                ...personalInput,
                userId: 'user-second',
                createdAt: new Date('2026-02-02T00:00:00.000Z'),
                createdBy: 'admin-harbor',
            };

            const result = util.buildStages(UserCreateContract.admin, [
                { ...personalInput, createdBy: 'admin-harbor' },
                second,
            ]);

            expect(result[0]).toMatchObject({
                action: UserCreateContract.admin.createdAction,
                metadata: {
                    actorUserId: 'admin-harbor',
                    timestamp: new Date('2026-02-01T00:00:00.000Z'),
                },
            });
            expect(result[2]).toMatchObject({
                action: UserCreateContract.admin.createdAction,
                metadata: {
                    actorUserId: 'admin-harbor',
                    timestamp: new Date('2026-02-02T00:00:00.000Z'),
                },
            });
        });
    });

    describe('buildAcceptedTermPolicyTypes', () => {
        it('returns the required types followed by cookies and marketing when both are accepted', () => {
            expect(util.buildAcceptedTermPolicyTypes(true, true)).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.cookies,
                EnumTermPolicyType.marketing,
            ]);
        });

        it('returns the required types alone when neither is accepted', () => {
            expect(util.buildAcceptedTermPolicyTypes(false, false)).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
        });

        it('adds cookies alone when only cookies is accepted', () => {
            expect(util.buildAcceptedTermPolicyTypes(true, false)).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.cookies,
            ]);
        });

        it('adds marketing alone when only marketing is accepted', () => {
            expect(util.buildAcceptedTermPolicyTypes(false, true)).toEqual([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.marketing,
            ]);
        });
    });

    describe('buildTermPolicyAcceptanceEntries', () => {
        it('maps each input onto its user, accepted types, and creator', () => {
            expect(
                util.buildTermPolicyAcceptanceEntries([personalInput])
            ).toEqual([
                {
                    userId: user.id,
                    types: [
                        EnumTermPolicyType.termsOfService,
                        EnumTermPolicyType.privacy,
                    ],
                    createdBy: user.id,
                },
            ]);
        });
    });

    describe('buildPasswordHistoryEntries', () => {
        it('maps each input holding a password and a history type, skipping the rest', () => {
            const withPassword: IUserCreateWithWorkspaceInput = {
                ...personalInput,
                password: {
                    passwordHash: 'hashed-password',
                    passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                    passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
                    passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                },
                passwordHistoryType: EnumPasswordHistoryType.admin,
                createdBy: 'admin-harbor',
            };
            const social: IUserCreateWithWorkspaceInput = {
                ...personalInput,
                userId: 'user-social',
            };

            expect(
                util.buildPasswordHistoryEntries([withPassword, social])
            ).toEqual([
                {
                    userId: 'user-harbor',
                    password: 'hashed-password',
                    type: EnumPasswordHistoryType.admin,
                    expiredAt: new Date('2026-04-01T00:00:00.000Z'),
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    createdBy: 'admin-harbor',
                },
            ]);
        });
    });

    describe('buildActivities', () => {
        it('builds a sign-up personal create activity set with no acting admin', () => {
            const input = personalInput;

            const result = util['buildActivities'](
                UserCreateContract.signUp,
                input
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
                    action: EnumActivityLogAction.userVerificationEmailSent,
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

        it('builds an admin personal create activity set naming the acting admin, with no verification email request', () => {
            const input = { ...personalInput, createdBy: 'admin-harbor' };

            const result = util['buildActivities'](
                UserCreateContract.admin,
                input
            );

            expect(result).toEqual([
                {
                    action: UserCreateContract.admin.createdAction,
                    userId: user.id,
                    workspaceId: null,
                    createdBy: 'admin-harbor',
                    metadata: {
                        actorUserId: 'admin-harbor',
                        timestamp: personalInput.createdAt,
                    },
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

        it('builds an invite create activity set, skipping the verification email request and adding the inviter row', () => {
            const inviteContext: IUserCreateWorkspaceInvite = {
                type: EnumUserCreateWorkspaceContextType.invite,
                workspaceId: 'workspace-harbor',
                workspaceInviteId: 'invite-harbor',
                invitedByUserId: 'inviter-harbor',
                workspaceMemberRole: EnumWorkspaceMemberRole.member,
                projectId: null,
                projectMemberRole: null,
            };
            const input = { ...personalInput, workspaceContext: inviteContext };

            const result = util['buildActivities'](
                UserCreateContract.social,
                input
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

        it('builds an invite create activity set with no inviter row when the inviter is the new user', () => {
            const inviteContext: IUserCreateWorkspaceInvite = {
                type: EnumUserCreateWorkspaceContextType.invite,
                workspaceId: 'workspace-harbor',
                workspaceInviteId: 'invite-harbor',
                invitedByUserId: user.id,
                workspaceMemberRole: EnumWorkspaceMemberRole.admin,
                projectId: 'project-harbor',
                projectMemberRole: EnumProjectMemberRole.admin,
            };
            const input = { ...personalInput, workspaceContext: inviteContext };

            const result = util['buildActivities'](
                UserCreateContract.social,
                input
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
});
