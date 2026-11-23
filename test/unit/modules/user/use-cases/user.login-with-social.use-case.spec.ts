import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumPasswordHistoryType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumWorkspaceInviteStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Country, WorkspaceInvite } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type {
    IAuthPassword,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserLoginMfaChallenge,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { UserLoginWithSocialUseCase } from '@modules/user/use-cases/user.login-with-social.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthSocialContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginWithSocialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userSocialService: MockProxy<UserSocialService> =
        mock<UserSocialService>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const userRegistrationService: MockProxy<UserRegistrationService> =
        mock<UserRegistrationService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLoginWithSocialUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.create.timeoutInMs': 5000,
    };
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleKey: EnumRolePlatformKey.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const tokenOutcome: IUserLoginOutcome = {
        isMfaRequired: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens,
    };
    const device = {
        fingerprint: 'device-bramble',
        platform: EnumDevicePlatform.web,
    };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthSocialContext(
        'bramble@example.com',
        'subject-bramble'
    );
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const welcomeSocialEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.welcomeSocial,
            context: {
                userId: 'user-bramble',
                proceedBy: 'user-bramble',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'welcomeSocial-user-bramble',
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-bramble',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-bramble',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };
    const committedUser: IUser = baseUser;
    const mfaChallenge: IUserLoginMfaChallenge = {
        challengeToken: 'challenge-token',
        expiresInMs: 60000,
        methods: [EnumMfaMethod.passkey, EnumMfaMethod.backupCode],
        passkeyOptions: { challenge: 'challenge-webauthn' },
    };
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
    };
    const country: Country = {
        id: 'country-bramble',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const personalContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble', 'w-bramble-b'],
        name: "bramble2fox's Workspace",
    };
    const inviteContext: IUserSignUpWorkspaceInvite = {
        type: EnumUserSignUpWorkspaceContextType.invite,
        workspaceId: 'workspace-invite',
        workspaceInviteId: 'invite-bramble',
        invitedByUserId: 'user-inviter',
        workspaceMemberRoleId: 'role-workspace-member',
        projectId: 'project-bramble',
        projectMemberRoleId: 'role-project-admin',
    };
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const input: IUserCreateWithWorkspaceInput = {
        userId: 'user-bramble',
        email: 'bramble@example.com',
        name: null,
        username: 'bramble2fox',
        countryId: 'country-bramble',
        roleId: 'role-bramble',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        verifiedAt: null,
        acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
        password,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
        verification: {
            reference: 'VRF-bramble',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
            to: 'bramble@example.com',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            verifiedAt: null,
            isUsed: false,
        },
        workspaceContext: personalContext,
        createdBy: 'user-bramble',
    };
    const inviteInput: IUserCreateWithWorkspaceInput = {
        ...input,
        workspaceContext: inviteContext,
    };
    const acceptanceEntry: ITermPolicyAcceptanceCreate = {
        userId: 'user-bramble',
        types: [EnumTermPolicyType.termsOfService],
        createdBy: 'user-bramble',
    };
    const stageInput = {
        action: EnumActivityLogAction.userSignedUp,
        userId: 'user-bramble',
        createdBy: 'user-bramble',
        metadata: {},
    };
    const clearUsername: IUserCheckUsername = {
        badWord: false,
        exist: false,
        pattern: false,
    };
    const role: IRole = {
        id: 'role-bramble',
        name: 'user',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policyRevision: 0,
        description: null,
        isImmutable: false,
    };
    const invite: WorkspaceInvite = {
        id: 'invite-bramble',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-inviter',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-inviter',
        workspaceId: 'workspace-invite',
        email: 'bramble@example.com',
        token: 'hashed-token',
        workspaceRoleId: 'role-workspace-member',
        projectId: 'project-bramble',
        projectRoleId: 'role-project-admin',
        reference: 'WIN-bramble',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-inviter',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    beforeEach(async () => {
        vi.resetAllMocks();

        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        notificationService.notify.mockReturnValue(welcomeSocialEffect);
        userUtil.isUnverified.mockReturnValue(false);
        mfaService.isEnabled.mockResolvedValue(false);
        deviceUtil.toIdentity.mockReturnValue(deviceIdentity);
        userAuthService.createTokenAndSessionInTx.mockResolvedValue(session);
        userRegistrationService.createInTx.mockResolvedValue([committedUser]);
        userCreateUtil.buildTermPolicyAcceptanceEntries.mockReturnValue([
            acceptanceEntry,
        ]);
        workspaceUtil.countSlugAttempts.mockReturnValue(2);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleService.getRefByScopeAndKey.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);
        workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginWithSocialUseCase,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserService, useValue: userService },
                { provide: UserSocialService, useValue: userSocialService },
                {
                    provide: UserRegistrationService,
                    useValue: userRegistrationService,
                },
                { provide: NotificationService, useValue: notificationService },
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                { provide: UserUtil, useValue: userUtil },
                { provide: MfaService, useValue: mfaService },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserLoginWithSocialUseCase);
    });

    describe('execute', () => {
        const dto: UserCreateSocialRequestDto = {
            username: 'bramble2fox',
            name: 'Bramble Fox',
            countryId: 'country-bramble',
            marketing: true,
            cookies: true,
            from: EnumUserLoginFrom.website,
            device,
        };
        const social: IUserLoginSocial = {
            from: dto.from,
            device: deviceIdentity,
            username: dto.username,
            inviteToken: null,
            name: dto.name!,
            countryId: dto.countryId,
            cookies: dto.cookies,
            marketing: dto.marketing,
        };

        beforeEach(() => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(null);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                personalContext
            );
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                true
            );
            userSocialService.getUserIdBySubject.mockResolvedValue(null);
            userRegistrationService.buildSocialCreate.mockReturnValue(input);
            userService.checkUsername.mockResolvedValue(clearUsername);
            userAuthService.getOneForSocialLogin.mockResolvedValue(baseUser);
            userCreateUtil.buildStages.mockReturnValue([stageInput]);
        });

        it('logs the user linked to the subject in without the email lookup or the sign-up check', async () => {
            userSocialService.getUserIdBySubject.mockResolvedValue(
                'user-bramble'
            );
            userAuthService.getOneForSocialLoginById.mockResolvedValue(
                baseUser
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(userSocialService.getUserIdBySubject).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle,
                'subject-bramble'
            );
            expect(
                userAuthService.getOneForSocialLoginById
            ).toHaveBeenCalledWith('user-bramble');
            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(userSocialService.assertLinkable).not.toHaveBeenCalled();
            expect(userSocialService.linkInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
        });

        it('commits the new user, the social welcome effect, the created entries, and the session on one tx', async () => {
            const callOrder: string[] = [];
            userRegistrationService.createInTx.mockResolvedValue([
                committedUser,
            ]);
            userAuthService.createTokenAndSessionInTx.mockImplementation(
                async () => {
                    callOrder.push('login');

                    return session;
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle
            );
            expect(deviceUtil.toIdentity).toHaveBeenCalledWith(device);
            expect(
                userRegistrationService.buildSocialCreate
            ).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                { roleId: 'role-bramble', workspaceContext: personalContext }
            );
            expect(outboxService.withTransaction).toHaveBeenNthCalledWith(
                1,
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(userCreateUtil.buildStages).toHaveBeenCalledWith(
                UserCreateContract.social,
                [input],
                [committedUser]
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                stageInput
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                { userId: 'user-bramble', proceedBy: 'user-bramble' }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                welcomeSocialEffect,
                entryEffect,
            ]);
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', null);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                committedUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(callOrder).toEqual(['login']);
        });

        it('logs an existing user in without creating one or sending a welcome', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(roleService.getRefByScopeAndKey).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.assertVerified).not.toHaveBeenCalled();
            expect(notificationService.notify).not.toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                expect.anything()
            );
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
        });

        it('links the subject of a new user inside the sign-up transaction after the user row', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialApple,
                dto
            );

            expect(userSocialService.linkInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginWith.socialApple,
                'subject-bramble'
            );
            expect(userRegistrationService.createInTx).toHaveBeenCalledBefore(
                userSocialService.linkInTx
            );
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(userSocialService.assertLinkable).not.toHaveBeenCalled();
        });

        it('links the subject to the account holding the email before the session is created', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(userSocialService.assertLinkable).toHaveBeenCalledWith(
                'user-bramble',
                EnumUserLoginWith.socialGoogle
            );
            expect(userSocialService.linkInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginWith.socialGoogle,
                'subject-bramble'
            );
            expect(userSocialService.assertLinkable).toHaveBeenCalledBefore(
                outboxService.withTransaction
            );
            expect(userSocialService.linkInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('rejects with the not found exception and opens no transaction when no account holds the email', async () => {
            const failure = new UserNotFoundException();
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);

            expect(userSocialService.assertLinkable).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('rejects with the provider exception and writes nothing when the account holds another subject', async () => {
            const failure = new AuthSocialGoogleInvalidException(
                'Google subject does not match the linked account'
            );
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userSocialService.assertLinkable.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(userSocialService.linkInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an MFA user', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(baseUser);
            mfaService.isEnabled.mockResolvedValue(true);
            userAuthService.createMfaChallengeInTx.mockResolvedValue(
                mfaChallenge
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({
                data: {
                    isMfaRequired: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    mfa: mfaChallenge,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledBefore(userAuthService.createMfaChallengeInTx);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userAuthService.createMfaChallengeInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle
            );
            expect(mfaService.isEnabled).toHaveBeenCalledWith('user-bramble');
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('checks the sign-up gate with the apple provider for an apple sign-in', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialApple,
                dto
            );

            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialApple
            );
        });

        it('creates a new invited user, joins the workspace, and issues tokens', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            userRegistrationService.buildSocialCreate.mockReturnValue(
                inviteInput
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'invite-bramble',
                    }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                'role-project-admin',
                'user-bramble'
            );
            expect(projectMemberService.createInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledTimes(1);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('leaves no user row when the workspace join fails', async () => {
            const failure = new WorkspaceInviteInvalidException();
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            userRegistrationService.buildSocialCreate.mockReturnValue(
                inviteInput
            );
            workspaceInviteService.acceptOnSignUpInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'invite-bramble',
                    }
                )
            ).rejects.toBe(failure);

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userRegistrationService.createInTx).toHaveBeenCalledWith(
                tx,
                [inviteInput]
            );
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
            expect(notificationService.notify).not.toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                expect.anything()
            );
        });

        it('passes a null name and forwards the invite token', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            const dtoWithoutName: UserCreateSocialRequestDto = {
                username: dto.username,
                countryId: dto.countryId,
                marketing: dto.marketing,
                cookies: dto.cookies,
                from: dto.from,
                device,
                inviteToken: 'invite-bramble',
            };

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dtoWithoutName
            );

            expect(
                userRegistrationService.buildSocialCreate
            ).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                expect.objectContaining({
                    name: null,
                    inviteToken: 'invite-bramble',
                }),
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('skips the invite and the sign-up gates for an existing user', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'stale-token',
                    }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteService.getSignUpInvite
            ).not.toHaveBeenCalled();
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).not.toHaveBeenCalled();
            expect(
                userRegistrationService.buildSocialCreate
            ).not.toHaveBeenCalled();
        });

        it('resolves the invite once the user is known to be new', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'raw-token',
                    }
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).toHaveBeenCalledBefore(workspaceInviteService.getSignUpInvite);
        });

        it('validates the invite against the trimmed lowercase email', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, email: ' Bramble@Example.COM ' },
                EnumUserLoginWith.socialGoogle,
                { ...dto, inviteToken: 'invite-bramble' }
            );

            expect(workspaceInviteService.getSignUpInvite).toHaveBeenCalledWith(
                'invite-bramble',
                'bramble@example.com'
            );
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).toHaveBeenCalledWith(invite, dto.username);
        });

        it('creates no user when sign-up is not allowed', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(roleService.getRefByScopeAndKey).not.toHaveBeenCalled();
            expect(
                userRegistrationService.buildSocialCreate
            ).not.toHaveBeenCalled();
            expect(notificationService.notify).not.toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                expect.anything()
            );
        });

        it('answers the country gate before the username gate', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(userService.assertUsernameAvailable).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleService.getRefByScopeAndKey.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(
                userRegistrationService.buildSocialCreate
            ).not.toHaveBeenCalled();
        });

        it('verifies an unverified user and starts the session on one tx', async () => {
            userUtil.isUnverified.mockReturnValueOnce(true);
            const unverified = { ...baseUser, isVerified: false };
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(unverified);
            userAuthService.verifyEmailBySocialInTx.mockResolvedValue(baseUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                unverified
            );
            expect(userAuthService.assertVerified).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledBefore(userAuthService.createTokenAndSessionInTx);
        });

        it('verifies an unverified MFA user and creates the challenge on one tx', async () => {
            userUtil.isUnverified.mockReturnValueOnce(true);
            const mfaUser: IUser = { ...baseUser, isVerified: false };
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(mfaUser);
            mfaService.isEnabled.mockResolvedValue(true);
            userAuthService.verifyEmailBySocialInTx.mockResolvedValue({
                ...mfaUser,
                isVerified: true,
            });
            userAuthService.createMfaChallengeInTx.mockResolvedValue(
                mfaChallenge
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledWith(tx, requestContext, apiKeyContext, mfaUser);
            expect(userAuthService.createMfaChallengeInTx).toHaveBeenCalledWith(
                tx,
                mfaUser.id,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle
            );
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledBefore(userAuthService.createMfaChallengeInTx);
        });

        it('answers the lookup error of an existing-user path whose email holds no user', async () => {
            const failure = new UserNotFoundException();
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('wraps a session failure of a new user, whose sign-up shares the transaction', async () => {
            const failure = new Error('session failed');
            userAuthService.createTokenAndSessionInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).not.toHaveBeenCalled();
        });
    });

    describe('signUpWithSocial', () => {
        const social: IUserLoginSocial = {
            from: EnumUserLoginFrom.website,
            device: deviceIdentity,
            username: 'bramble2fox',
            inviteToken: 'invite-bramble',
            name: 'Bramble Fox',
            countryId: 'country-bramble',
            cookies: true,
            marketing: true,
        };

        beforeEach(() => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            userRegistrationService.buildSocialCreate.mockReturnValue(
                inviteInput
            );
            userService.checkUsername.mockResolvedValue(clearUsername);
            userCreateUtil.buildStages.mockReturnValue([stageInput]);
        });

        it('runs every write on one transaction in sign-up order', async () => {
            const owned = {
                userId: 'user-bramble',
                workspaceId: 'workspace-invite',
                name: 'Bramble',
                slug: 'w-bramble',
            };
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);

            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(userRegistrationService.createInTx).toHaveBeenCalledWith(
                tx,
                [inviteInput]
            );
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [inviteInput],
                0
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                'role-project-admin',
                'user-bramble'
            );
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);

            expect(
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).toHaveBeenCalledBefore(userRegistrationService.createInTx);
            expect(userRegistrationService.createInTx).toHaveBeenCalledBefore(
                workspaceService.createOwnedForUsersInTx
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(workspaceInviteService.acceptOnSignUpInTx);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(projectMemberService.createInTx);
            expect(projectMemberService.createInTx).toHaveBeenCalledBefore(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                { userId: 'user-bramble', proceedBy: 'user-bramble' }
            );
            expect(userCreateUtil.buildStages).toHaveBeenCalledWith(
                UserCreateContract.social,
                [inviteInput],
                [committedUser]
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                stageInput
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                welcomeSocialEffect,
                entryEffect,
            ]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledBefore(outboxService.addManyInTx);
            expect(outboxService.addManyInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                committedUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
        });

        it('returns the created user with the session tokens', async () => {
            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).resolves.toEqual({ user: committedUser, tokens });
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            userRegistrationService.buildSocialCreate.mockReturnValue({
                ...inviteInput,
                workspaceContext: {
                    ...inviteContext,
                    projectId: null,
                    projectMemberRoleId: null,
                },
            });

            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite for a personal input', async () => {
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                personalContext
            );
            userRegistrationService.buildSocialCreate.mockReturnValue({
                ...input,
                password: null,
                passwordHistoryType: null,
                verification: null,
            });

            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...social, inviteToken: null },
                now,
                'subject-bramble'
            );

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
            expect(
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('inserts nothing when a required term policy is not published', async () => {
            const failure = new TermPolicyRequiredNotPublishedException();
            termPolicyAcceptanceService.assertRequiredPublishedInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toBe(failure);
            expect(userRegistrationService.createInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            outboxService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [inviteInput],
                1
            );
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'slug'
            );
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            outboxService.withTransaction.mockRejectedValue(
                new Error('slug collision')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('throws the exception the create util maps a non-slug collision to', async () => {
            const otherError = new Error('duplicate email');
            outboxService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new UserEmailExistException();
            userCreateUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toBe(mapped);
            expect(userCreateUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('wraps a non-collision error the create util leaves unmapped in the unknown exception', async () => {
            const otherError = new Error('unexpected');
            outboxService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(otherError);

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });
});
