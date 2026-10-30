import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
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
    DeviceOwnership,
    TwoFactor,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthToken,
    IAuthTwoFactorChallengeCache,
    IAuthTwoFactorVerifyResult,
} from '@modules/auth/interfaces/auth.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type {
    ISession,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserImportUsernameChecks,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingHttpService } from '@modules/user/services/user.onboarding.http.service';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import {
    expectSessionRevoked,
    stubUserRefreshSession,
} from '@test/unit/helpers/test.unit.user-refresh.helper';
import type { IUserRefreshSessionDoubles } from '@test/unit/helpers/test.unit.user-refresh.helper';

describe('UserOnboardingHttpService', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userOnboardingUtil: MockProxy<UserOnboardingUtil> =
        mock<UserOnboardingUtil>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const termPolicyAcceptanceDomain: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const authJwtDomain: MockProxy<AuthJwtDomain> = mock<AuthJwtDomain>();
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const refreshSessionDoubles: IUserRefreshSessionDoubles = {
        authJwtDomain,
        sessionDomain,
    };

    let service: UserOnboardingHttpService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.default.country': 'ID',
        'user.onboarding.createTimeoutInMs': 5000,
        'user.onboarding.createBulkTimeoutInMs': 30000,
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
    const device = { fingerprint: 'device-bramble' };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: null,
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
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const enabledTwoFactor = { ...twoFactor, enabled: true };
    const twoFactorUser: IUser = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const committedUser: IUser = { ...baseUser, twoFactor };
    const ownership: DeviceOwnership = {
        id: 'device-ownership-bramble',
        deviceId: 'device-bramble',
        userId: 'user-bramble',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        notificationToken: 'token-bramble',
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const upsert: IDeviceLoginUpsert = {
        device: {
            id: 'device-bramble',
            fingerprint: 'device-bramble',
            name: null,
            platform: EnumDevicePlatform.android,
            lastActiveAt: now,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        deviceOwnership: ownership,
        isNewDevice: true,
    };
    const revokedRef: ISessionRef[] = [{ id: 'session-bramble' }];
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
    const emailVerification: IUserVerificationEmailCreate = {
        type: 'email',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        expiredInMinutes: 15,
        resendInMinutes: 5,
        reference: 'VRF-bramble',
        token: 'raw-token',
        hashedToken: 'hashed-token',
        link: 'https://example.com/verify?token=raw-token',
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
    };
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const verified: IAuthTwoFactorVerifyResult = {
        isValid: true,
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        sessionDomain.getRequestLog.mockReturnValue(requestLog);
        activityLogDomain.prepare.mockReturnValue(activityLog);
        notificationUtil.mapRecipient.mockReturnValue(recipient);
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        deviceDomain.getOwnershipsWithNotificationToken.mockResolvedValue([
            ownership,
        ]);
        notificationDomain.getListUserSetting.mockResolvedValue([]);
        deviceDomain.upsertForLoginInTx.mockResolvedValue(upsert);
        deviceUtil.resolveNotificationProvider.mockReturnValue(null);
        authJwtDomain.createLoginIdentifiers.mockReturnValue({
            sessionId: 'session-bramble',
            jti: 'jti-bramble',
        });
        authJwtDomain.createTokens.mockReturnValue(tokens);
        Object.defineProperty(
            authJwtDomain,
            'jwtRefreshTokenExpirationTimeInSeconds',
            { value: 2592000, configurable: true }
        );
        userDomain.createManyInTx.mockResolvedValue([baseUser]);
        userTwoFactorDomain.createDisabledInTx.mockResolvedValue(twoFactor);
        workspaceUtil.countSlugAttempts.mockReturnValue(2);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleDomain.getByName.mockResolvedValue(role);
        countryDomain.getOne.mockResolvedValue(country);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserOnboardingHttpService,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: UserImportDomain, useValue: userImportDomain },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: NotificationDomain, useValue: notificationDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: NotificationUtil, useValue: notificationUtil },
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: AuthJwtDomain, useValue: authJwtDomain },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        service = module.get(UserOnboardingHttpService);
    });

    describe('signUp', () => {
        const dto: UserSignUpRequestDto = {
            username: 'bramble2fox',
            countryId: 'country-bramble',
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plainPassword123!',
            marketing: true,
            cookies: true,
            from: EnumUserSignUpFrom.website,
        };
        const signUpInput: IUserSignUp = {
            username: 'bramble2fox',
            email: 'bramble@example.com',
            name: null,
            countryId: 'country-bramble',
            password: 'plainPassword123!',
            from: EnumUserSignUpFrom.website,
            cookies: true,
            marketing: true,
            inviteToken: null,
        };

        beforeEach(() => {
            userOnboardingUtil.buildPersonalWorkspaceContexts.mockReturnValue([
                personalContext,
            ]);
            userAuthDomain.prepareSignUp.mockResolvedValue({
                input,
                emailVerification,
            });
            userDomain.existsByEmail.mockResolvedValue(false);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('commits the new user on one transaction, stages the onboarding rows, sends the welcome, and returns an empty envelope', async () => {
            await expect(service.signUp(dto)).resolves.toEqual({});

            expect(
                userOnboardingUtil.buildPersonalWorkspaceContexts
            ).toHaveBeenCalledWith(['bramble2fox']);
            expect(roleDomain.getByName).toHaveBeenCalledWith('user');
            expect(countryDomain.getOne).toHaveBeenCalledWith(
                'country-bramble'
            );
            expect(userAuthDomain.prepareSignUp).toHaveBeenCalledWith(
                signUpInput,
                { roleId: 'role-bramble', workspaceContext: personalContext }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.signUp,
                [input],
                [committedUser],
                null
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcome,
                [],
                []
            );
            expect(notificationQueue.sendWelcome).toHaveBeenCalledWith(
                recipient,
                {
                    expiredAt: '2026-03-05T00:00:00.000Z',
                    reference: 'VRF-bramble',
                    link: 'https://example.com/verify?token=raw-token',
                    expiredInMinutes: 15,
                }
            );
        });

        it('stages the onboarding rows before the welcome enqueue', async () => {
            const callOrder: string[] = [];
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendWelcome.mockImplementation(async () => {
                callOrder.push('sendWelcome');
            });

            await service.signUp(dto);

            expect(callOrder).toEqual(['stagePrepared', 'sendWelcome']);
        });

        it('forwards the name and reads the invite before the role when a token is present', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockResolvedValue(
                invite
            );
            userOnboardingUtil.buildInviteWorkspaceContext.mockReturnValue(
                inviteContext
            );

            await service.signUp({
                ...dto,
                name: 'Bramble Fox',
                inviteToken: 'raw-token',
            });

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
            expect(
                workspaceInviteDomain.validateInviteForEmail
            ).toHaveBeenCalledWith('raw-token', 'bramble@example.com');
            expect(
                userOnboardingUtil.buildInviteWorkspaceContext
            ).toHaveBeenCalledWith(invite);
            expect(
                userOnboardingUtil.buildPersonalWorkspaceContexts
            ).not.toHaveBeenCalled();
            expect(userAuthDomain.prepareSignUp).toHaveBeenCalledWith(
                {
                    ...signUpInput,
                    name: 'Bramble Fox',
                    inviteToken: 'raw-token',
                },
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('throws the disabled exception before any read when invitations are closed', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.signUp({ ...dto, inviteToken: 'raw-token' })
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceInviteDomain.validateInviteForEmail
            ).not.toHaveBeenCalled();
            expect(roleDomain.getByName).not.toHaveBeenCalled();
        });

        it('throws the invite exception before the role read when the invite does not resolve', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                service.signUp({ ...dto, inviteToken: 'raw-token' })
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(roleDomain.getByName).not.toHaveBeenCalled();
        });

        it('answers the role gate before the email and username gates', async () => {
            roleDomain.getByName.mockRejectedValue(new RoleNotFoundException());
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(service.signUp(dto)).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
            expect(userAuthDomain.prepareSignUp).not.toHaveBeenCalled();
        });

        it('answers the country gate before the email and username gates', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(service.signUp(dto)).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                messagePath: 'country.error.notFound',
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate and opens no transaction', async () => {
            userDomain.existsByEmail.mockResolvedValue(true);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(service.signUp(dto)).rejects.toBeInstanceOf(
                UserEmailExistException
            );
            expect(userDomain.assertEmailAvailable).toHaveBeenCalledWith(true);
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the username gate rejects', async () => {
            userDomain.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(service.signUp(dto)).rejects.toBeInstanceOf(
                UserUsernameExistException
            );
            expect(userDomain.assertUsernameAvailable).toHaveBeenCalledWith(
                clearUsername
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('stages and enqueues nothing when the commit throws', async () => {
            const failure = new UserEmailExistException();
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userOnboardingUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(service.signUp(dto)).rejects.toBe(failure);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcome).not.toHaveBeenCalled();
        });
    });

    describe('loginWithSocial', () => {
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
            userOnboardingUtil.buildPersonalWorkspaceContexts.mockReturnValue([
                personalContext,
            ]);
            featureFlagDomain.getMetadataByKey.mockResolvedValue({
                signUpAllowed: true,
            });
            userAuthDomain.getOneByEmail.mockResolvedValue(null);
            userAuthDomain.prepareSocialCreate.mockReturnValue(input);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(baseUser);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginGoogle
            );
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('commits the new user, stages the onboarding rows, logs in, and sends the social welcome after the login', async () => {
            const callOrder: string[] = [];
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(
                committedUser
            );
            userDomain.createManyInTx.mockResolvedValue([baseUser]);
            userDomain.updateLoginInTx.mockImplementation(async () => {
                callOrder.push('login');

                return baseUser;
            });
            notificationQueue.sendWelcomeSocial.mockImplementation(async () => {
                callOrder.push('sendWelcomeSocial');
            });

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(featureFlagDomain.getMetadataByKey).toHaveBeenCalledWith(
                'loginWithGoogle'
            );
            expect(userAuthDomain.prepareSocialCreate).toHaveBeenCalledWith(
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
            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.social,
                [input],
                [committedUser],
                null
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
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
            userAuthDomain.getOneByEmail.mockResolvedValue(baseUser);

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(roleDomain.getByName).not.toHaveBeenCalled();
            expect(userAuthDomain.getOneForSocialLogin).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle
            );
            expect(userAuthDomain.verifyEmailBySocial).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('reads the apple flag for an apple sign-in', async () => {
            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialApple,
                dto
            );

            expect(featureFlagDomain.getMetadataByKey).toHaveBeenCalledWith(
                'loginWithApple'
            );
        });

        it('passes a null name and forwards the invite token', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockResolvedValue(
                invite
            );
            userOnboardingUtil.buildInviteWorkspaceContext.mockReturnValue(
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

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dtoWithoutName
            );

            expect(userAuthDomain.prepareSocialCreate).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                expect.objectContaining({
                    name: null,
                    inviteToken: 'invite-bramble',
                }),
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('resolves the invite before the user-exists gate', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );
            userAuthDomain.getOneByEmail.mockResolvedValue(baseUser);

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'raw-token' }
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(featureFlagDomain.getMetadataByKey).not.toHaveBeenCalled();
        });

        it.each([null, { signUpAllowed: false }])(
            'creates no user when the flag metadata is %j',
            async metadata => {
                featureFlagDomain.getMetadataByKey.mockResolvedValue(metadata);

                await service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                );

                expect(roleDomain.getByName).not.toHaveBeenCalled();
                expect(
                    userAuthDomain.prepareSocialCreate
                ).not.toHaveBeenCalled();
                expect(
                    notificationQueue.sendWelcomeSocial
                ).not.toHaveBeenCalled();
            }
        );

        it('answers the country gate before the username gate', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userDomain.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({ module: 'country' });
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleDomain.getByName.mockRejectedValue(new RoleNotFoundException());

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(userAuthDomain.prepareSocialCreate).not.toHaveBeenCalled();
        });

        it('marks an unverified user verified and stages the row before logging in', async () => {
            const unverified = { ...baseUser, isVerified: false };
            userAuthDomain.getOneByEmail.mockResolvedValue(baseUser);
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(unverified);
            userAuthDomain.verifyEmailBySocial.mockResolvedValue(baseUser);

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(userAuthDomain.verifyEmailBySocial).toHaveBeenCalledWith(
                unverified
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                requestLog.ipAddress,
                now
            );
        });

        it('rejects without the welcome when the login of a new user fails', async () => {
            const failure = new Error('login failed');
            userAuthDomain.getOneForSocialLogin.mockRejectedValue(failure);

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
        });
    });

    describe('createByAdmin', () => {
        const dto: UserCreateRequestDto = {
            username: 'bramble2fox',
            email: 'bramble@example.com' as Lowercase<string>,
            roleId: 'role-bramble',
            countryId: 'country-bramble',
        };
        const actor: IUser = {
            ...baseUser,
            id: 'admin-bramble',
            role: { ...baseUser.role, type: EnumRoleType.admin },
            roleId: 'role-actor-bramble',
        };

        beforeEach(() => {
            roleDomain.getById.mockResolvedValue(role);
            userDomain.existsByEmail.mockResolvedValue(false);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input,
                passwordString: 'random-password',
            });
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('commits once without the policy assertion, stages the rows, and sends the welcome with the generated password', async () => {
            await expect(service.createByAdmin(dto, actor)).resolves.toEqual({
                data: { id: 'user-bramble' },
            });

            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(userDomain.prepareCreateByAdmin).toHaveBeenCalledWith(
                {
                    username: 'bramble2fox',
                    email: 'bramble@example.com',
                    name: null,
                    roleId: 'role-bramble',
                    countryId: 'country-bramble',
                },
                'admin-bramble',
                role
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.admin,
                [input],
                [committedUser],
                EnumActivityLogAction.adminUserCreate
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );
            expect(notificationQueue.sendWelcomeByAdmin).toHaveBeenCalledWith(
                recipient,
                {
                    password: 'random-password',
                    passwordCreatedAt: '2026-03-05T00:00:00.000Z',
                    passwordExpiredAt: '2026-03-05T00:00:00.000Z',
                },
                'admin-bramble'
            );
        });

        it('sends no welcome when the created account carries no password', async () => {
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input: { ...input, password: null, passwordHistoryType: null },
                passwordString: 'random-password',
            });

            await service.createByAdmin(dto, actor);

            expect(notificationQueue.sendWelcomeByAdmin).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before the rank and identity gates when the role is missing', async () => {
            roleDomain.getById.mockRejectedValue(new RoleNotFoundException());

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(roleDomain.assertActorOutranks).not.toHaveBeenCalled();
            expect(countryDomain.getOne).not.toHaveBeenCalled();
            expect(userDomain.existsByEmail).not.toHaveBeenCalled();
            expect(userDomain.checkUsername).not.toHaveBeenCalled();
        });

        it('throws the rank exception before any country or identity read', async () => {
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw new RoleRankForbiddenException();
            });

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(countryDomain.getOne).not.toHaveBeenCalled();
            expect(userDomain.existsByEmail).not.toHaveBeenCalled();
            expect(userDomain.checkUsername).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before the identity gates', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate', async () => {
            userDomain.existsByEmail.mockResolvedValue(true);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toBeInstanceOf(UserEmailExistException);
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('importByAdmin', () => {
        const rows: UserImportRequestDto[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com' as Lowercase<string>,
            },
        ];
        const imported: IUserImport[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com',
                name: null,
            },
        ];
        const usernameChecks: IUserImportUsernameChecks = {
            existing: [],
            badWords: [false],
        };

        beforeEach(() => {
            countryDomain.getIdByAlpha2Code.mockResolvedValue(
                'country-bramble'
            );
            userImportDomain.getExistingEmails.mockResolvedValue([]);
            userImportDomain.getUsernameChecks.mockResolvedValue(
                usernameChecks
            );
            userImportDomain.prepareImportByAdmin.mockResolvedValue({
                inputs: [input],
                passwordHasheds: [password],
                passwordStrings: ['random-password'],
            });
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('checks the emails, prepares, commits in bulk with the bulk timeout, stages the rows, and enqueues the welcomes', async () => {
            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).resolves.toEqual({});

            expect(userImportDomain.getExistingEmails).toHaveBeenCalledWith([
                'bramble@example.com',
            ]);
            expect(userImportDomain.getUsernameChecks).toHaveBeenCalledWith([
                'bramble2fox',
            ]);
            expect(userImportDomain.assertEmailsAvailable).toHaveBeenCalledWith(
                []
            );
            expect(roleDomain.getByName).toHaveBeenCalledWith('user');
            expect(countryDomain.getIdByAlpha2Code).toHaveBeenCalledWith('ID');
            expect(userImportDomain.prepareImportByAdmin).toHaveBeenCalledWith(
                imported,
                'admin-bramble',
                role,
                'country-bramble',
                usernameChecks
            );
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.admin,
                [input],
                [committedUser],
                EnumActivityLogAction.adminUserImport
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(
                notificationQueue.sendWelcomeByAdminBulk
            ).toHaveBeenCalledWith(
                [
                    {
                        recipient,
                        data: {
                            password: 'random-password',
                            passwordCreatedAt: '2026-03-05T00:00:00.000Z',
                            passwordExpiredAt: '2026-03-05T00:00:00.000Z',
                        },
                    },
                ],
                'admin-bramble'
            );
        });

        it('throws the import email exception before the role and country gates', async () => {
            userImportDomain.getExistingEmails.mockResolvedValue([
                'bramble@example.com',
            ]);
            userImportDomain.assertEmailsAvailable.mockImplementation(() => {
                throw new UserImportEmailExistException('bramble@example.com');
            });

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toBeInstanceOf(UserImportEmailExistException);
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleDomain.getByName.mockRejectedValue(new RoleNotFoundException());

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before preparing when the default country is missing', async () => {
            countryDomain.getIdByAlpha2Code.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('loginCredential', () => {
        const dto: UserLoginRequestDto = {
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plain-password',
            from: EnumUserLoginFrom.website,
            device,
        };
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };

        beforeEach(() => {
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(
                counted
            );
            userAuthDomain.verifyCredential.mockResolvedValue(true);
        });

        it('logs the user in on one transaction and purges the session cache entries of a repeat device after the commit', async () => {
            const callOrder: string[] = [];
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedRef
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(
                userAuthDomain.incrementCredentialAttempt
            ).toHaveBeenCalledWith(dto.email);
            expect(userAuthDomain.assertAttemptCounted).toHaveBeenCalledWith(
                counted
            );
            expect(userAuthDomain.verifyCredential).toHaveBeenCalledWith(
                counted,
                dto.password
            );
            expect(userAuthDomain.assertPasswordMatched).toHaveBeenCalledWith(
                true
            );
            expect(deviceDomain.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                null,
                now
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'device-ownership-bramble',
                'user-bramble',
                now
            );
            expect(sessionDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble',
                'jti-bramble',
                now,
                requestLog
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(callOrder).toEqual([
                'committed',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('forwards the optional device fields when present', async () => {
            await service.loginCredential({
                ...dto,
                device: {
                    fingerprint: 'device-bramble',
                    name: 'Bramble phone',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-bramble',
                },
            });

            expect(deviceDomain.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                {
                    fingerprint: 'device-bramble',
                    name: 'Bramble phone',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-bramble',
                },
                null,
                now
            );
            expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
                EnumDevicePlatform.ios
            );
        });

        it('stages the login row once the tokens are issued', async () => {
            await service.loginCredential(dto);

            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('stages the failed-login row before the mismatch is answered', async () => {
            const failure = new Error('not match');
            userAuthDomain.verifyCredential.mockResolvedValue(false);
            userAuthDomain.assertPasswordMatched.mockImplementation(() => {
                throw failure;
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginFailed,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledBefore(
                userAuthDomain.assertPasswordMatched
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('locks the account out on one transaction, purges, and stages both rows before the attempt limit is answered', async () => {
            const spent = { ...counted, isAttemptCounted: false };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(spent);
            userDomain.deactivateForMaxPasswordAttemptInTx.mockResolvedValue();
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue(revokedRef);
            const failure = new Error('attempt max');
            userAuthDomain.assertAttemptCounted.mockImplementation(() => {
                throw failure;
            });
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(
                userDomain.deactivateForMaxPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble');
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'user-bramble',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'user-bramble',
                now
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(callOrder).toEqual([
                'committed',
                'purgeLogins',
                'stagePrepared',
            ]);
            expect(userAuthDomain.verifyCredential).not.toHaveBeenCalled();
        });

        it('stages and purges nothing when the lockout write finds the account already deactivated', async () => {
            const spent = { ...counted, isAttemptCounted: false };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(spent);
            userDomain.deactivateForMaxPasswordAttemptInTx.mockRejectedValue(
                new UserPasswordAttemptMaxException()
            );

            await expect(service.loginCredential(dto)).rejects.toBeInstanceOf(
                UserPasswordAttemptMaxException
            );

            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(userAuthDomain.verifyCredential).not.toHaveBeenCalled();
        });

        it('sends the verification email, stages its row, and answers the unverified gate for an unverified user', async () => {
            const unverified = { ...baseUser, isVerified: false };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: unverified,
            });
            const loginVerification = {
                reference: 'ref-bramble',
                link: 'https://example.com/verify',
                expiredInMinutes: 15,
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            } as Awaited<
                ReturnType<UserAuthDomain['persistLoginVerification']>
            >;
            userAuthDomain.persistLoginVerification.mockResolvedValue(
                loginVerification
            );
            const failure = new Error('not verified');
            userAuthDomain.assertVerified.mockImplementation(() => {
                throw failure;
            });
            const callOrder: string[] = [];
            notificationDomain.getListUserSetting.mockImplementation(
                async () => {
                    callOrder.push('getRecipient');

                    return [];
                }
            );
            userAuthDomain.persistLoginVerification.mockImplementation(
                async () => {
                    callOrder.push('persist');

                    return loginVerification;
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendVerificationEmail.mockImplementation(
                async () => {
                    callOrder.push('sendVerificationEmail');
                }
            );

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                unverified,
                EnumNotificationKind.verificationEmail,
                ['token-bramble'],
                []
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(
                notificationQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(recipient, {
                expiredAt: '2026-03-05T00:00:00.000Z',
                reference: 'ref-bramble',
                link: 'https://example.com/verify',
                expiredInMinutes: 15,
            });
            expect(callOrder).toEqual([
                'getRecipient',
                'persist',
                'stagePrepared',
                'sendVerificationEmail',
            ]);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an already set-up two-factor user', async () => {
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: twoFactorUser,
            });
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: {
                        isRequiredSetup: false,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                    },
                },
            });

            expect(authTwoFactorDomain.createChallenge).toHaveBeenCalledWith({
                userId: 'user-bramble',
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates a challenge and a fresh setup, stores the secret, and stages the setup row when two-factor requires setup', async () => {
            const requiresSetup: IUser = {
                ...twoFactorUser,
                twoFactor: { ...twoFactor, enabled: true, requiredSetup: true },
            };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: requiresSetup,
            });
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: {
                        isRequiredSetup: true,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                        otpauthUrl: 'otpauth://totp/secret',
                        secret: 'secret',
                    },
                },
            });

            expect(authTwoFactorDomain.setupTwoFactor).toHaveBeenCalledWith(
                'user-bramble',
                'bramble@example.com'
            );
            expect(userTwoFactorDomain.saveSetup).toHaveBeenCalledWith(
                'user-bramble',
                'encrypted-secret'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('writes no secret when the challenge fails during setup', async () => {
            const requiresSetup: IUser = {
                ...twoFactorUser,
                twoFactor: { ...twoFactor, enabled: true, requiredSetup: true },
            };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: requiresSetup,
            });
            const failure = new Error('challenge failed');
            authTwoFactorDomain.createChallenge.mockRejectedValue(failure);
            authTwoFactorDomain.setupTwoFactor.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('loginVerifyTwoFactor', () => {
        const dto = {
            challengeToken: 'challenge-token',
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        beforeEach(() => {
            authTwoFactorDomain.getChallenge.mockResolvedValue(challenge);
            userTwoFactorDomain.getOneForLoginVerify.mockResolvedValue(
                twoFactorUser
            );
            userTwoFactorDomain.getEnabledTwoFactor.mockReturnValue(
                enabledTwoFactor
            );
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifyTwoFactor.mockResolvedValue(verified);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginCredential
            );
        });

        it('verifies the challenge user, records the verification, issues the session on one transaction, drops the challenge, and stages both rows', async () => {
            const callOrder: string[] = [];
            authTwoFactorDomain.assertUnlocked.mockImplementation(async () => {
                callOrder.push('assertUnlocked');
            });
            authTwoFactorDomain.assertMethodProvided.mockImplementation(() => {
                callOrder.push('assertMethodProvided');
            });
            userTwoFactorDomain.incrementAttempt.mockImplementation(
                async () => {
                    callOrder.push('incrementAttempt');

                    return 1;
                }
            );
            authTwoFactorDomain.assertAttemptAllowed.mockImplementation(
                async () => {
                    callOrder.push('assertAttemptAllowed');
                }
            );
            authTwoFactorDomain.assertValid.mockImplementation(() => {
                callOrder.push('assertValid');
            });
            userTwoFactorDomain.resetAttempt.mockImplementation(async () => {
                callOrder.push('resetAttempt');
            });
            userTwoFactorDomain.recordVerification.mockImplementation(
                async () => {
                    callOrder.push('recordVerification');
                }
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginVerifyTwoFactor(dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorDomain.getChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userTwoFactorDomain.getOneForLoginVerify
            ).toHaveBeenCalledWith('user-bramble');
            expect(authTwoFactorDomain.assertUnlocked).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(
                authTwoFactorDomain.assertMethodProvided
            ).toHaveBeenCalledWith(EnumAuthTwoFactorMethod.code);
            expect(
                userTwoFactorDomain.getEnabledTwoFactor
            ).toHaveBeenCalledWith(twoFactorUser);
            expect(userTwoFactorDomain.incrementAttempt).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(
                authTwoFactorDomain.assertAttemptAllowed
            ).toHaveBeenCalledWith(twoFactorUser, 1);
            expect(authTwoFactorDomain.verifyTwoFactor).toHaveBeenCalledWith(
                enabledTwoFactor,
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumAuthTwoFactorMethod.code,
                }
            );
            expect(authTwoFactorDomain.assertValid).toHaveBeenCalledWith(true);
            expect(userTwoFactorDomain.resetAttempt).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(userTwoFactorDomain.recordVerification).toHaveBeenCalledWith(
                twoFactorUser,
                verified
            );
            expect(deviceDomain.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                null,
                now
            );
            expect(sessionDomain.createInTx).toHaveBeenCalledTimes(1);
            expect(userDomain.updateLoginInTx).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(authTwoFactorDomain.deleteChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(callOrder).toEqual([
                'assertUnlocked',
                'assertMethodProvided',
                'incrementAttempt',
                'assertAttemptAllowed',
                'assertValid',
                'resetAttempt',
                'recordVerification',
                'stagePrepared',
                'committed',
                'stagePrepared',
            ]);
        });

        it('forwards the backup code', async () => {
            await service.loginVerifyTwoFactor({
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'backup-code',
            });

            expect(authTwoFactorDomain.verifyTwoFactor).toHaveBeenCalledWith(
                enabledTwoFactor,
                {
                    code: null,
                    backupCode: 'backup-code',
                    method: EnumAuthTwoFactorMethod.backupCodes,
                }
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorDomain.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(
                service.loginVerifyTwoFactor(dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorDomain.getOneForLoginVerify
            ).not.toHaveBeenCalled();
        });

        it('issues nothing and stages nothing when the verification fails', async () => {
            const failure = new Error('invalid code');
            authTwoFactorDomain.assertValid.mockImplementation(() => {
                throw failure;
            });

            await expect(service.loginVerifyTwoFactor(dto)).rejects.toBe(
                failure
            );

            expect(userTwoFactorDomain.resetAttempt).not.toHaveBeenCalled();
            expect(
                userTwoFactorDomain.recordVerification
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('keeps the challenge and stages no login row when the session transaction fails', async () => {
            const failure = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(failure);
            const callOrder: string[] = [];
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginVerifyTwoFactor(dto)).rejects.toBe(
                failure
            );

            expect(callOrder).toEqual(['stagePrepared']);
        });
    });

    describe('loginSetupTwoFactor', () => {
        const dto = { challengeToken: 'challenge-token', code: '123456' };

        beforeEach(() => {
            userTwoFactorDomain.incrementAttempt.mockResolvedValue(1);
            authTwoFactorDomain.verifySetupCode.mockReturnValue(true);
            authTwoFactorDomain.getChallenge.mockResolvedValue(challenge);
            userTwoFactorDomain.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue([
                'backup-one',
            ]);
        });

        it('verifies the setup code against the pending secret, enables two-factor, and stages the row', async () => {
            await expect(service.loginSetupTwoFactor(dto)).resolves.toEqual({
                data: { backupCodes: ['backup-one'] },
            });

            expect(
                userTwoFactorDomain.getOneForLoginSetup
            ).toHaveBeenCalledWith('user-bramble');
            expect(authTwoFactorDomain.assertUnlocked).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(userTwoFactorDomain.incrementAttempt).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(
                authTwoFactorDomain.assertAttemptAllowed
            ).toHaveBeenCalledWith(twoFactorUser, 1);
            expect(authTwoFactorDomain.verifySetupCode).toHaveBeenCalledWith(
                'pending-secret',
                'user-bramble',
                '123456'
            );
            expect(authTwoFactorDomain.assertValid).toHaveBeenCalledWith(true);
            expect(userTwoFactorDomain.resetAttempt).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledWith(
                'user-bramble',
                'pending-secret'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(userTwoFactorDomain.resetAttempt).toHaveBeenCalledBefore(
                userTwoFactorDomain.enableTwoFactor
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorDomain.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(
                service.loginSetupTwoFactor(dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorDomain.getOneForLoginSetup
            ).not.toHaveBeenCalled();
        });

        it('enables nothing when the setup code is wrong', async () => {
            const failure = new Error('invalid code');
            authTwoFactorDomain.verifySetupCode.mockReturnValue(false);
            authTwoFactorDomain.assertValid.mockImplementation(() => {
                throw failure;
            });

            await expect(service.loginSetupTwoFactor(dto)).rejects.toBe(
                failure
            );

            expect(authTwoFactorDomain.assertValid).toHaveBeenCalledWith(false);
            expect(userTwoFactorDomain.resetAttempt).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const payload: IAuthJwtRefreshTokenPayload = {
            loginAt: now,
            userId: 'user-bramble',
            sessionId: 'session-bramble',
            deviceOwnershipId: 'device-ownership-bramble',
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        };
        const session: ISession = {
            id: 'session-bramble',
            userId: 'user-bramble',
            deviceOwnershipId: 'device-ownership-bramble',
            jti: 'old-jti',
            ipAddress: '127.0.0.1',
            userAgent: requestLog.userAgent,
            geoLocation: null,
            expiredAt: new Date('2026-04-01T00:00:00.000Z'),
            revokedAt: null,
            isRevoked: false,
            revokedById: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            user: {
                id: 'user-bramble',
                name: 'Bramble Fox',
                username: 'bramble2fox',
                photo: null,
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
                deletedAt: null,
                deletedBy: null,
            },
            revokedBy: null,
        };
        const refreshed: IAuthAccessTokenGenerate = {
            tokens,
            jti: 'new-jti',
            sessionId: 'session-bramble',
        };

        it('rotates the session by compare-and-set, stamps the login, rotates the cached entry, and stages the refresh row in order', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                session,
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockReturnValue(tokens);
            const callOrder: string[] = [];
            sessionDomain.updateJtiInTx.mockImplementation(async () => {
                callOrder.push('updateJtiInTx');

                return true;
            });
            userDomain.updateLoginInTx.mockImplementation(async () => {
                callOrder.push('updateLoginInTx');

                return baseUser;
            });
            sessionDomain.updateLogin.mockImplementation(async () => {
                callOrder.push('updateLogin');

                return EnumSessionCacheUpdate.updated;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ data: tokens });

            expect(sessionDomain.getOneActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionDomain.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-bramble',
                'old-jti',
                'new-jti'
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(sessionDomain.updateLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'old-jti',
                'new-jti'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRefreshToken,
            });
            expect(sessionDomain.getRefreshedTokens).toHaveBeenCalledWith(
                tokens
            );
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'updateJtiInTx',
                'updateLoginInTx',
                'updateLogin',
                'stagePrepared',
            ]);
        });

        it('writes a fresh login entry when the cached one expired with the access token', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                session,
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockReturnValue(tokens);
            sessionDomain.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.absent
            );

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ data: tokens });

            expect(sessionDomain.setLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'new-jti'
            );
            expect(sessionDomain.revokeOnReuse).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException before reading the token when the store has no request log', async () => {
            sessionDomain.getRequestLog.mockImplementation(() => {
                throw new RequestContextMissingException(RequestLogStoreKey);
            });

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                messagePath: 'request.error.contextMissing',
            });
            expect(authJwtDomain.payloadToken).not.toHaveBeenCalled();
        });

        it('throws AuthJwtRefreshTokenInvalidException when the token carries no jti', async () => {
            authJwtDomain.payloadToken.mockReturnValue(payload);
            authJwtDomain.getRefreshJti.mockImplementation(() => {
                throw new AuthJwtRefreshTokenInvalidException();
            });

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
            expect(sessionDomain.getOneActive).not.toHaveBeenCalled();
        });

        it('throws SessionRevokedException when the session row is gone, revoking nothing', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                session,
                refreshed,
            });
            sessionDomain.getOneActive.mockRejectedValue(
                new SessionRevokedException()
            );

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(sessionDomain.updateJtiInTx).not.toHaveBeenCalled();
            expect(sessionDomain.revokeOnReuse).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('revokes the session after the commit, purges it, stages the revoke row, and answers revoked when the jti compare-and-set matches no row', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                session,
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionDomain.updateJtiInTx.mockResolvedValue(false);
            sessionDomain.revokeOnReuse.mockResolvedValue(revokedRef);
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionDomain.revokeOnReuse.mockImplementation(async () => {
                callOrder.push('revokeOnReuse');

                return revokedRef;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(sessionDomain.revokeOnReuse).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(sessionDomain.getRefreshedTokens).toHaveBeenCalledWith(null);
            expect(userDomain.updateLoginInTx).not.toHaveBeenCalled();
            expect(sessionDomain.updateLogin).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'committed',
                'revokeOnReuse',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('revokes the session and answers revoked when the cached jti is not the one presented', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                session,
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionDomain.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.mismatch
            );
            sessionDomain.revokeOnReuse.mockResolvedValue(revokedRef);

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
        });

        it('propagates a failure raised while rotating the session', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                session,
                refreshed,
            });
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toBe(failure);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('revokes the session and clears the device notification on one transaction, then purges the session and stages the logout row', async () => {
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                service.logout(
                    'user-bramble',
                    'session-bramble',
                    'device-ownership-bramble'
                )
            ).resolves.toEqual({});

            expect(sessionDomain.validateActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionDomain.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'user-bramble',
                now
            );
            expect(deviceDomain.clearNotificationInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'device-ownership-bramble',
                'user-bramble',
                now
            );
            expect(sessionDomain.revokeInTx).toHaveBeenCalledBefore(
                deviceDomain.clearNotificationInTx
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                [{ id: 'session-bramble' }]
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLogout,
            });
            expect(callOrder).toEqual([
                'committed',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('rethrows the not-active gate of the session before opening a transaction', async () => {
            const failure = new SessionNotFoundException();
            sessionDomain.validateActive.mockRejectedValue(failure);

            await expect(
                service.logout('user-bramble', 'session-bramble', 'device')
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('propagates a failure raised while logging out without purging or staging', async () => {
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.logout('user-bramble', 'session-bramble', 'device')
            ).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('commit', () => {
        it('runs every write on one transaction in sign-up order', async () => {
            const owned = {
                userId: 'user-bramble',
                workspaceId: 'workspace-invite',
                name: 'Bramble',
                slug: 'w-bramble',
            };
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);

            const users = await service['commit'](
                [inviteInput],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(users).toEqual([committedUser]);
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(userDomain.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'hashed',
                EnumPasswordHistoryType.signUp,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-bramble'
            );
            expect(notificationDomain.createDefaultsInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble'
            );
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                inviteInput.verification,
                'user-bramble'
            );
            expect(userTwoFactorDomain.createDisabledInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'user-bramble'
            );
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [inviteInput],
                0
            );
            expect(
                workspaceDomain.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(
                termPolicyAcceptanceDomain.acceptPublishedInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                [EnumTermPolicyType.termsOfService],
                'user-bramble'
            );

            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledBefore(userDomain.createManyInTx);
            expect(userDomain.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryDomain.createInTx
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledBefore(
                notificationDomain.createDefaultsInTx
            );
            expect(
                notificationDomain.createDefaultsInTx
            ).toHaveBeenCalledBefore(
                userVerificationDomain.createFromOnboardingInTx
            );
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).toHaveBeenCalledBefore(userTwoFactorDomain.createDisabledInTx);
            expect(
                userTwoFactorDomain.createDisabledInTx
            ).toHaveBeenCalledBefore(workspaceDomain.createOwnedForUsersInTx);
            expect(
                workspaceDomain.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(workspaceInviteDomain.acceptOnSignUpInTx);
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(projectMemberDomain.createInTx);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledBefore(
                termPolicyAcceptanceDomain.acceptPublishedInTx
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            await service['commit'](
                [
                    {
                        ...inviteInput,
                        workspaceContext: {
                            ...inviteContext,
                            projectId: null,
                            projectMemberRole: null,
                        },
                    },
                ],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite and writes no history, verification, or password row for a personal social input', async () => {
            await service['commit'](
                [
                    {
                        ...input,
                        password: null,
                        passwordHistoryType: null,
                        verification: null,
                    },
                ],
                EnumUserCreateMode.social,
                5000
            );

            expect(passwordHistoryDomain.createInTx).not.toHaveBeenCalled();
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('skips the published assertion for an admin create', async () => {
            await service['commit']([input], EnumUserCreateMode.admin, 5000);

            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
        });

        it('inserts nothing when a required term policy is not published', async () => {
            const failure = new TermPolicyRequiredNotPublishedException();
            termPolicyAcceptanceDomain.assertRequiredPublishedInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userOnboardingUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(
                service['commit']([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toBe(failure);
            expect(userDomain.createManyInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const users = await service['commit'](
                [input],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(users).toEqual([committedUser]);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [input],
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
                service['commit']([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('throws the exception the onboarding util maps a non-slug collision to', async () => {
            const otherError = new Error('duplicate email');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new UserEmailExistException();
            userOnboardingUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                service['commit']([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toBe(mapped);
            expect(userOnboardingUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('wraps a non-collision error the onboarding util leaves unmapped in the unknown exception', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userOnboardingUtil.mapCreateCollision.mockReturnValue(otherError);

            await expect(
                service['commit']([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });

    describe('createTokenAndSession', () => {
        it('reads the recipient, creates the session on the transaction, stamps the login, caches the entry, and enqueues the purge and the new-device notice', async () => {
            const callOrder: string[] = [];
            notificationDomain.getListUserSetting.mockImplementation(
                async () => {
                    callOrder.push('getRecipient');

                    return [];
                }
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            authJwtDomain.createTokens.mockImplementation(() => {
                callOrder.push('createTokens');

                return tokens;
            });
            sessionDomain.setLogin.mockImplementation(async () => {
                callOrder.push('setLogin');
            });

            const result = await service['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toBe(tokens);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.newDeviceLogin,
                ['token-bramble'],
                []
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(sessionDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble',
                'jti-bramble',
                loginAt,
                requestLog
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(authJwtDomain.createTokens).toHaveBeenCalledWith(
                baseUser,
                {
                    sessionId: 'session-bramble',
                    jti: 'jti-bramble',
                    deviceOwnershipId: 'device-ownership-bramble',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(sessionDomain.setLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'jti-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledWith(
                recipient,
                {
                    requestLog,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    loginAt: '2026-03-05T00:00:00.000Z',
                },
                'session-bramble'
            );
            expect(callOrder).toEqual([
                'getRecipient',
                'committed',
                'createTokens',
                'setLogin',
            ]);
        });

        it('announces no new device for an existing one', async () => {
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });

            await service['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
        });

        it('still enqueues the session purge and the new-device notice when the login cache write rejects', async () => {
            const failure = new Error('cache down');
            sessionDomain.setLogin.mockRejectedValue(failure);

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledTimes(
                1
            );
        });

        it('resolves the notification provider from a null platform when the device carries none', async () => {
            await service['createTokenAndSession'](
                baseUser,
                { ...deviceIdentity, platform: null },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
                null
            );
        });

        it('fails the login before the transaction when the recipient read rejects', async () => {
            const failure = new Error('recipient-unavailable');
            notificationDomain.getListUserSetting.mockRejectedValue(failure);

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException before any write when the store has no request log', async () => {
            sessionDomain.getRequestLog.mockImplementation(() => {
                throw new RequestContextMissingException(RequestLogStoreKey);
            });

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('signs nothing and writes no cache key when the transaction fails', async () => {
            const failure = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(authJwtDomain.createTokens).not.toHaveBeenCalled();
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });
    });

    describe('reachMaxAttempt', () => {
        it('maps a write conflict on the lockout to the attempt-max exception', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service['reachMaxAttempt']('user-bramble')
            ).rejects.toBeInstanceOf(UserPasswordAttemptMaxException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('wraps any other failure of the lockout in the unknown exception', async () => {
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service['reachMaxAttempt']('user-bramble')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
        });
    });
});
