import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Country,
    TwoFactor,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type {
    IActivityLogStageInput,
    IActivityLogStaged,
} from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IAuthPassword,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionService } from '@modules/session/services/session.service';
import type {
    ISessionPurgeLoginsPayload,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserLoginTwoFactorChallenge,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
    IUserTwoFactorEnabled,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { UserLoginWithSocialUseCase } from '@modules/user/use-cases/user.login-with-social.use-case';

describe('UserLoginWithSocialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userRegistrationService: MockProxy<UserRegistrationService> =
        mock<UserRegistrationService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
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
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLoginWithSocialUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.create.timeoutInMs': 5000,
    };
    const requestLog: IRequestLog = {
        userAgent: {
            ua: 'ua',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const tokenOutcome: IUserLoginOutcome = {
        isTwoFactorEnable: false,
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
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-bramble',
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
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
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const committedUser: IUser = { ...baseUser, twoFactor };
    const verifyChallenge: IUserLoginTwoFactorChallenge = {
        isRequiredSetup: false,
        challengeToken: 'challenge-token',
        challengeExpiresInMs: 60000,
        backupCodesRemaining: 1,
    };
    const setupChallenge: IUserLoginTwoFactorChallenge = {
        isRequiredSetup: true,
        challengeToken: 'challenge-token',
        challengeExpiresInMs: 60000,
        backupCodesRemaining: 1,
        otpauthUrl: 'otpauth://totp/secret',
        secret: 'secret',
    };
    const revokedRef: ISessionRef[] = [{ id: 'session-bramble' }];
    const session: IUserLoginSession = {
        tokens,
        sessionId: 'session-bramble',
        jti: 'jti-bramble',
        requestLog,
        isNewDevice: true,
        revoked: [],
        affected: [],
        revokeStages: [],
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
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-bramble',
        projectMemberRole: EnumProjectMemberRole.admin,
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
        type: EnumRoleType.user,
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
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-bramble',
        projectRole: EnumProjectMemberRole.admin,
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

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        activityLogService.prepare.mockReturnValue(activityLog);
        notificationUtil.mapRecipient.mockReturnValue(recipient);
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        userUtil.isUnverified.mockReturnValue(false);
        userUtil.isTwoFactorEnabled.mockReturnValue(false);
        userUtil.requiresTwoFactorSetup.mockReturnValue(false);
        notificationService.getRecipient.mockResolvedValue(recipient);
        deviceUtil.toIdentity.mockReturnValue(deviceIdentity);
        userAuthService.createTokenAndSession.mockResolvedValue(session);
        userRegistrationService.createInTx.mockResolvedValue([committedUser]);
        userCreateUtil.buildTermPolicyAcceptanceEntries.mockReturnValue([
            acceptanceEntry,
        ]);
        workspaceUtil.countSlugAttempts.mockReturnValue(2);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleService.getByName.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);
        workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginWithSocialUseCase,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserService, useValue: userService },
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
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                { provide: UserUtil, useValue: userUtil },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: DatabaseService, useValue: databaseService },
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
            userCreateUtil.buildSocialCreate.mockReturnValue(input);
            userService.checkUsername.mockResolvedValue(clearUsername);
            userAuthService.getOneForSocialLogin.mockResolvedValue(baseUser);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginGoogle
            );
            userCreateUtil.buildStages.mockReturnValue([stageInput]);
        });

        it('commits the new user, stages the created rows, logs in, and sends the social welcome after the login', async () => {
            const callOrder: string[] = [];
            userAuthService.getOneForSocialLogin.mockResolvedValue(
                committedUser
            );
            userRegistrationService.createInTx.mockResolvedValue([
                committedUser,
            ]);
            userAuthService.createTokenAndSession.mockImplementation(
                async () => {
                    callOrder.push('login');

                    return session;
                }
            );
            notificationQueue.sendWelcomeSocial.mockImplementation(async () => {
                callOrder.push('sendWelcomeSocial');
            });

            await expect(
                useCase.execute(
                    'bramble@example.com',
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
            expect(userCreateUtil.buildSocialCreate).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                { roleId: 'role-bramble', workspaceContext: personalContext }
            );
            expect(databaseService.withTransaction).toHaveBeenNthCalledWith(
                1,
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(userCreateUtil.buildStages).toHaveBeenCalledWith(
                UserCreateContract.social,
                [input],
                [committedUser]
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith(stageInput);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcomeSocial,
                [],
                []
            );
            expect(notificationQueue.sendWelcomeSocial).toHaveBeenCalledWith(
                recipient
            );
            expect(callOrder).toEqual(['login', 'sendWelcomeSocial']);
        });

        it('logs an existing user in without creating one or sending a welcome', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(roleService.getByName).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle
            );
            expect(userAuthService.verifyEmailBySocial).not.toHaveBeenCalled();
            expect(userAuthService.assertVerified).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an already set-up two-factor user', async () => {
            const twoFactorUser: IUserTwoFactorEnabled = {
                ...baseUser,
                twoFactor: { ...twoFactor, enabled: true },
            };
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(
                twoFactorUser
            );
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.createTwoFactorChallenge.mockResolvedValue(
                verifyChallenge
            );

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: verifyChallenge,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledBefore(userAuthService.createTwoFactorChallenge);
            expect(
                userAuthService.createTwoFactorChallenge
            ).toHaveBeenCalledWith(
                twoFactorUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle
            );
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });

        it('stages the setup row when the challenge requires setup', async () => {
            const requiresSetup: IUserTwoFactorEnabled = {
                ...baseUser,
                twoFactor: { ...twoFactor, enabled: true, requiredSetup: true },
            };
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(
                requiresSetup
            );
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthService.createTwoFactorChallenge.mockResolvedValue(
                setupChallenge
            );

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: setupChallenge,
                },
            });

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
        });

        it('checks the sign-up gate with the apple provider for an apple sign-in', async () => {
            await useCase.execute(
                'bramble@example.com',
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
            userCreateUtil.buildSocialCreate.mockReturnValue(inviteInput);
            userAuthService.getOneForSocialLogin.mockResolvedValue(
                committedUser
            );

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'invite-bramble' }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(projectMemberService.createInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSession
            );
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledTimes(
                1
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('leaves no user row when the workspace join fails', async () => {
            const failure = new WorkspaceInviteInvalidException();
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            userCreateUtil.buildSocialCreate.mockReturnValue(inviteInput);
            workspaceInviteService.acceptOnSignUpInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'invite-bramble' }
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userRegistrationService.createInTx).toHaveBeenCalledWith(
                tx,
                [inviteInput]
            );
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
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
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dtoWithoutName
            );

            expect(userCreateUtil.buildSocialCreate).toHaveBeenCalledWith(
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
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'stale-token' }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteService.getSignUpInvite
            ).not.toHaveBeenCalled();
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).not.toHaveBeenCalled();
            expect(userCreateUtil.buildSocialCreate).not.toHaveBeenCalled();
        });

        it('resolves the invite once the user is known to be new', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'raw-token' }
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
                ' Bramble@Example.COM ',
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
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(roleService.getByName).not.toHaveBeenCalled();
            expect(userCreateUtil.buildSocialCreate).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
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
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({ module: 'country' });
            expect(userService.assertUsernameAvailable).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleService.getByName.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(userCreateUtil.buildSocialCreate).not.toHaveBeenCalled();
        });

        it('marks an unverified user verified and stages the row before logging in', async () => {
            userUtil.isUnverified.mockReturnValueOnce(true);
            const unverified = { ...baseUser, isVerified: false };
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(unverified);
            userAuthService.verifyEmailBySocial.mockResolvedValue(baseUser);

            await useCase.execute(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(userAuthService.verifyEmailBySocial).toHaveBeenCalledWith(
                unverified
            );
            expect(userAuthService.assertVerified).not.toHaveBeenCalled();
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
        });

        it('rejects without the welcome when the login of a new user fails', async () => {
            const failure = new Error('login failed');
            userAuthService.getOneForSocialLogin.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
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
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                true
            );
            userCreateUtil.buildSocialCreate.mockReturnValue(inviteInput);
            userService.checkUsername.mockResolvedValue(clearUsername);
        });

        it('runs every write on one transaction in sign-up order', async () => {
            const owned = {
                userId: 'user-bramble',
                workspaceId: 'workspace-invite',
                name: 'Bramble',
                slug: 'w-bramble',
            };
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);

            const created = await useCase['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social
            );

            expect(created).toEqual({
                inputs: [inviteInput],
                users: [committedUser],
            });
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
                EnumProjectMemberRole.admin,
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
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            userCreateUtil.buildSocialCreate.mockReturnValue({
                ...inviteInput,
                workspaceContext: {
                    ...inviteContext,
                    projectId: null,
                    projectMemberRole: null,
                },
            });

            await useCase['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social
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
            userCreateUtil.buildSocialCreate.mockReturnValue({
                ...input,
                password: null,
                passwordHistoryType: null,
                verification: null,
            });

            await useCase['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...social, inviteToken: null }
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
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toBe(failure);
            expect(userRegistrationService.createInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const created = await useCase['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social
            );

            expect(created).toEqual({
                inputs: [inviteInput],
                users: [committedUser],
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
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
            databaseService.withTransaction.mockRejectedValue(
                new Error('slug collision')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                useCase['signUpWithSocial'](
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('throws the exception the create util maps a non-slug collision to', async () => {
            const otherError = new Error('duplicate email');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new UserEmailExistException();
            userCreateUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                useCase['signUpWithSocial'](
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toBe(mapped);
            expect(userCreateUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('wraps a non-collision error the create util leaves unmapped in the unknown exception', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(otherError);

            await expect(
                useCase['signUpWithSocial'](
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });

    describe('startSession', () => {
        const affected: ISessionPurgeLoginsPayload[] = [
            {
                userId: 'user-thistle',
                sessions: [
                    { id: 'session-thistle-1' },
                    { id: 'session-thistle-2' },
                ],
            },
            { userId: 'user-clover', sessions: [{ id: 'session-clover' }] },
        ];
        const thistleStage: IActivityLogStageInput<EnumActivityLogAction> = {
            action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
            userId: 'user-thistle',
            createdBy: 'user-bramble',
            metadata: { actorUserId: 'user-bramble', sessionCount: 2 },
        };
        const cloverStage: IActivityLogStageInput<EnumActivityLogAction> = {
            ...thistleStage,
            userId: 'user-clover',
        };
        const startArgs = [
            baseUser,
            deviceIdentity,
            EnumUserLoginFrom.website,
            EnumUserLoginWith.socialGoogle,
            loginAt,
        ] as const;

        it('reads the recipient before createTokenAndSession', async () => {
            await useCase['startSession'](...startArgs);

            expect(notificationService.getRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.newDeviceLogin
            );
            expect(notificationService.getRecipient).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSession
            );
            expect(userAuthService.createTokenAndSession).toHaveBeenCalledWith(
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                loginAt
            );
        });

        it('sets the login and purges the revoked sessions after the service call', async () => {
            userAuthService.createTokenAndSession.mockResolvedValue({
                ...session,
                revoked: revokedRef,
            });

            await useCase['startSession'](...startArgs);

            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'jti-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(sessionService.setLoginOrRevoke).toHaveBeenCalledAfter(
                userAuthService.createTokenAndSession
            );
        });

        it('purges once per affected user', async () => {
            userAuthService.createTokenAndSession.mockResolvedValue({
                ...session,
                affected,
            });

            await useCase['startSession'](...startArgs);

            expect(sessionQueue.purgeLogins).toHaveBeenCalledTimes(3);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-thistle',
                affected[0]!.sessions
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-clover',
                affected[1]!.sessions
            );
        });

        it('sends the new-device notification only for a new device', async () => {
            await useCase['startSession'](...startArgs);

            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledWith(
                recipient,
                {
                    requestLog,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.socialGoogle,
                    loginAt: '2026-03-05T00:00:00.000Z',
                },
                'session-bramble'
            );

            notificationQueue.sendNewDeviceLogin.mockClear();
            userAuthService.createTokenAndSession.mockResolvedValue({
                ...session,
                isNewDevice: false,
            });

            await useCase['startSession'](...startArgs);

            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
        });

        it('stages the revoke rows after the enqueues only when revokeStages is not empty', async () => {
            const callOrder: string[] = [];
            await useCase['startSession'](...startArgs);

            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

            userAuthService.createTokenAndSession.mockResolvedValue({
                ...session,
                affected,
                revokeStages: [thistleStage, cloverStage],
            });
            sessionQueue.purgeLogins.mockImplementation(async userId => {
                callOrder.push(`purge:${userId}`);
            });
            activityLogService.prepare
                .mockReturnValueOnce({ ...activityLog, userId: 'user-thistle' })
                .mockReturnValueOnce({ ...activityLog, userId: 'user-clover' });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await useCase['startSession'](...startArgs);

            expect(activityLogService.prepare).toHaveBeenCalledWith(
                thistleStage
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith(
                cloverStage
            );
            expect(
                activityLogService.stagePrepared
            ).toHaveBeenCalledExactlyOnceWith([
                { ...activityLog, userId: 'user-thistle' },
                { ...activityLog, userId: 'user-clover' },
            ]);
            expect(callOrder).toEqual([
                'purge:user-bramble',
                'purge:user-thistle',
                'purge:user-clover',
                'stagePrepared',
            ]);
        });

        it('returns the session tokens', async () => {
            await expect(useCase['startSession'](...startArgs)).resolves.toBe(
                tokens
            );
        });

        it('enqueues nothing when createTokenAndSession rejects', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSession.mockRejectedValue(failure);

            await expect(useCase['startSession'](...startArgs)).rejects.toBe(
                failure
            );

            expect(sessionService.setLoginOrRevoke).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('fails before the service call when the recipient read rejects', async () => {
            const failure = new Error('recipient-unavailable');
            notificationService.getRecipient.mockRejectedValue(failure);

            await expect(useCase['startSession'](...startArgs)).rejects.toBe(
                failure
            );

            expect(
                userAuthService.createTokenAndSession
            ).not.toHaveBeenCalled();
        });
    });
});
