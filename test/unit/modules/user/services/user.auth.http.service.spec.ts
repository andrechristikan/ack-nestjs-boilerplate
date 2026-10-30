import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AccountDomain } from '@modules/account/domains/account.domain';
import { AccountLoginDomain } from '@modules/account/domains/account.login.domain';
import { AccountPasswordDomain } from '@modules/account/domains/account.password.domain';
import type {} from '@modules/account/interfaces/account.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserAuthHttpService } from '@modules/user/services/user.auth.http.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserLoginOutcome,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';

describe('UserAuthHttpService', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const onboardingDomain: MockProxy<OnboardingDomain> =
        mock<OnboardingDomain>();
    const accountPasswordDomain: MockProxy<AccountPasswordDomain> =
        mock<AccountPasswordDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const accountDomain: MockProxy<AccountDomain> = mock<AccountDomain>();
    const accountLoginDomain: MockProxy<AccountLoginDomain> =
        mock<AccountLoginDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userOnboardingUtil: MockProxy<UserOnboardingUtil> =
        mock<UserOnboardingUtil>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: UserAuthHttpService;

    const outcome: IUserLoginOutcome = {
        isTwoFactorEnable: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens: {
            tokenType: 'Bearer',
            roleType: EnumRoleType.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        },
    };
    const device = { fingerprint: 'device-bramble' };
    const loginAt = new Date('2026-03-01T00:00:00.000Z');
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
    const tokens: IAuthToken = outcome.tokens!;

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

    const onboardingInput: IUserCreateWithWorkspaceInput = {
        userId: 'user-bramble',
        email: 'bramble@example.com',
        name: null,
        username: 'bramble2fox',
        countryId: 'country-bramble',
        roleId: 'role-bramble',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        acceptedTermPolicyTypes: [],
        password: null,
        passwordHistoryType: null,
        verification: null,
        workspaceContext: {
            type: EnumUserSignUpWorkspaceContextType.personal,
            workspaceId: 'workspace-bramble',
            slugCandidates: ['w-bramble'],
            name: "bramble2fox's Workspace",
        },
        createdBy: 'user-bramble',
    };
    const stageInput = {
        action: EnumActivityLogAction.userSignedUp,
        userId: 'user-bramble',
        createdBy: 'user-bramble',
        metadata: {},
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

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(loginAt);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        activityLogDomain.prepare.mockReturnValue(activityLog);
        notificationUtil.mapRecipient.mockReturnValue(recipient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthHttpService,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: OnboardingDomain, useValue: onboardingDomain },
                {
                    provide: AccountPasswordDomain,
                    useValue: accountPasswordDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: AccountDomain, useValue: accountDomain },
                { provide: AccountLoginDomain, useValue: accountLoginDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: UserUtil, useValue: userUtil },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(UserAuthHttpService);
    });

    describe('loginCredential', () => {
        const dto: UserLoginRequestDto = {
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plain-password',
            from: EnumUserLoginFrom.website,
            device,
        };
        const deviceIdentity = {
            fingerprint: 'device-bramble',
            name: null,
            platform: null,
            notificationToken: null,
        };
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };
        const revoked: ISessionRef[] = [{ id: 'session-one' }];

        beforeEach(() => {
            accountPasswordDomain.registerCredentialAttempt.mockResolvedValue({
                attempt: counted,
                revoked: null,
            });
            userAuthDomain.verifyCredential.mockResolvedValue(true);
            accountLoginDomain.login.mockResolvedValue(outcome);
        });

        it('logs the user in after the credential checks and wraps the outcome in a response envelope', async () => {
            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: outcome,
            });
            expect(
                accountPasswordDomain.registerCredentialAttempt
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
            expect(accountLoginDomain.login).toHaveBeenCalledWith(
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('forwards the optional device fields when present', async () => {
            const withDevice: UserLoginRequestDto = {
                ...dto,
                device: {
                    fingerprint: 'device-bramble',
                    name: 'Bramble phone',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-bramble',
                },
            };

            await service.loginCredential(withDevice);

            expect(accountLoginDomain.login).toHaveBeenCalledWith(
                baseUser,
                {
                    fingerprint: 'device-bramble',
                    name: 'Bramble phone',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-bramble',
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );
        });

        it('stages the login row once the tokens are issued', async () => {
            const callOrder: string[] = [];
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await service.loginCredential(dto);

            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(callOrder).toEqual(['stagePrepared']);
        });

        it('stages the failed-login row before the domain answers the mismatch', async () => {
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
            expect(accountLoginDomain.login).not.toHaveBeenCalled();
        });

        it('locks the account out, purges, and stages both rows before the domain answers the attempt limit', async () => {
            const spent = { ...counted, isAttemptCounted: false };
            accountPasswordDomain.registerCredentialAttempt.mockResolvedValue({
                attempt: spent,
                revoked,
            });
            const failure = new Error('attempt max');
            userAuthDomain.assertAttemptCounted.mockImplementation(() => {
                throw failure;
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revoked
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
            expect(userAuthDomain.assertAttemptCounted).toHaveBeenCalledWith(
                spent
            );
            expect(userAuthDomain.verifyCredential).not.toHaveBeenCalled();
        });

        it('stages nothing when the lockout write finds the account already deactivated', async () => {
            const failure = new Error('already deactivated');
            accountPasswordDomain.registerCredentialAttempt.mockRejectedValue(
                failure
            );

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(userAuthDomain.verifyCredential).not.toHaveBeenCalled();
        });

        it('sends the verification email, stages its row, and answers the unverified gate for an unverified user', async () => {
            const unverified = { ...baseUser, isVerified: false };
            accountPasswordDomain.registerCredentialAttempt.mockResolvedValue({
                attempt: { ...counted, user: unverified },
                revoked: null,
            });
            const emailVerification = {
                reference: 'ref-bramble',
                link: 'https://example.com/verify',
                expiredInMinutes: 15,
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            } as Awaited<
                ReturnType<UserAuthDomain['persistLoginVerification']>
            >;
            accountDomain.getNotificationRecipientOfUser.mockResolvedValue(
                recipient
            );
            userAuthDomain.persistLoginVerification.mockResolvedValue(
                emailVerification
            );
            const failure = new Error('not verified');
            userAuthDomain.assertVerified.mockImplementation(() => {
                throw failure;
            });
            const callOrder: string[] = [];
            accountDomain.getNotificationRecipientOfUser.mockImplementation(
                async () => {
                    callOrder.push('getRecipient');

                    return recipient;
                }
            );
            userAuthDomain.persistLoginVerification.mockImplementation(
                async () => {
                    callOrder.push('persist');

                    return emailVerification;
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

            expect(
                accountDomain.getNotificationRecipientOfUser
            ).toHaveBeenCalledWith(
                unverified,
                EnumNotificationKind.verificationEmail
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
            expect(accountLoginDomain.login).not.toHaveBeenCalled();
        });

        it('stages the setup row when two-factor still requires a setup', async () => {
            const setupLogin: IUserLoginOutcome = {
                isTwoFactorEnable: true,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 60000,
                    backupCodesRemaining: 0,
                    otpauthUrl: 'otpauth://totp/secret',
                    secret: 'secret',
                },
            };
            accountLoginDomain.login.mockResolvedValue(setupLogin);

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: setupLogin,
            });

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('stages nothing for a two-factor challenge that needs no setup', async () => {
            accountLoginDomain.login.mockResolvedValue({
                isTwoFactorEnable: true,
                lastWorkspaceId: null,
                lastWorkspaceChangedAt: null,
                twoFactor: {
                    isRequiredSetup: false,
                    challengeToken: 'challenge-token',
                    challengeExpiresInMs: 60000,
                    backupCodesRemaining: 3,
                },
            });

            await service.loginCredential(dto);

            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
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
        const social = {
            from: dto.from,
            device: {
                fingerprint: dto.device.fingerprint,
                name: null,
                platform: null,
                notificationToken: null,
            },
            username: dto.username,
            inviteToken: null,
            name: dto.name,
            countryId: dto.countryId,
            cookies: dto.cookies,
            marketing: dto.marketing,
        };

        beforeEach(() => {
            onboardingDomain.signUpWithSocial.mockResolvedValue(null);
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(baseUser);
            accountLoginDomain.login.mockResolvedValue(outcome);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginGoogle
            );
        });

        it('signs up if needed, logs in, and wraps the outcome', async () => {
            const result = await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(result).toEqual({ data: outcome });
            expect(onboardingDomain.signUpWithSocial).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social
            );
            expect(userAuthDomain.getOneForSocialLogin).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(accountLoginDomain.login).toHaveBeenCalledWith(
                baseUser,
                social.device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                loginAt
            );
            expect(userAuthDomain.verifyEmailBySocial).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
        });

        it('passes a null name when the dto omits it', async () => {
            const dtoWithoutName: UserCreateSocialRequestDto = {
                username: dto.username,
                countryId: dto.countryId,
                marketing: dto.marketing,
                cookies: dto.cookies,
                from: dto.from,
                device,
            };

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dtoWithoutName
            );

            expect(onboardingDomain.signUpWithSocial).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                expect.objectContaining({ name: null, inviteToken: null })
            );
        });

        it('forwards the invite token when the dto carries one', async () => {
            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...dto, inviteToken: 'invite-bramble' }
            );

            expect(onboardingDomain.signUpWithSocial).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                expect.objectContaining({ inviteToken: 'invite-bramble' })
            );
        });

        it('marks an unverified user verified and stages the row before logging in', async () => {
            const unverified = { ...baseUser, isVerified: false };
            const verified = { ...baseUser, isVerified: true };
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(unverified);
            userAuthDomain.verifyEmailBySocial.mockResolvedValue(verified);

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
            expect(accountLoginDomain.login).toHaveBeenCalledWith(
                verified,
                social.device,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                loginAt
            );
            expect(
                accountDomain.getNotificationRecipientOfUser
            ).not.toHaveBeenCalled();
        });

        it('stages the onboarding rows, then sends the social welcome after the login of a user the sign-in created', async () => {
            onboardingDomain.signUpWithSocial.mockResolvedValue({
                inputs: [onboardingInput],
                users: [baseUser],
            });
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
            const callOrder: string[] = [];
            accountLoginDomain.login.mockImplementation(async () => {
                callOrder.push('login');

                return outcome;
            });
            notificationQueue.sendWelcomeSocial.mockImplementation(async () => {
                callOrder.push('sendWelcomeSocial');
            });

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.social,
                [onboardingInput],
                [baseUser],
                null
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.welcomeSocial,
                [],
                []
            );
            expect(notificationQueue.sendWelcomeSocial).toHaveBeenCalledWith(
                recipient
            );
            expect(callOrder).toEqual(['login', 'sendWelcomeSocial']);
        });

        it('rejects without the welcome when the login of a new user fails', async () => {
            onboardingDomain.signUpWithSocial.mockResolvedValue({
                inputs: [onboardingInput],
                users: [baseUser],
            });
            userOnboardingUtil.buildActivityStages.mockReturnValue([]);
            const failure = new Error('login failed');
            accountLoginDomain.login.mockRejectedValue(failure);

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

    describe('refresh', () => {
        const payload = { tokens, revoked: [] as ISessionRef[] };

        it('wraps the rotated tokens in a response envelope and stages the refresh row', async () => {
            accountLoginDomain.refresh.mockResolvedValue(payload);
            accountLoginDomain.getRefreshedTokens.mockReturnValue(tokens);

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ data: tokens });
            expect(accountLoginDomain.refresh).toHaveBeenCalledWith(
                baseUser,
                'refresh-token'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRefreshToken,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });

        it('purges the revoked session, stages the revoke row, and answers the revoked session for a replayed refresh', async () => {
            const revoked: ISessionRef[] = [{ id: 'session-bramble' }];
            const failure = new Error('session revoked');
            accountLoginDomain.refresh.mockResolvedValue({
                tokens: null,
                revoked,
            });
            accountLoginDomain.getRefreshedTokens.mockImplementation(() => {
                throw failure;
            });
            const callOrder: string[] = [];
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            accountLoginDomain.getRefreshedTokens.mockImplementation(() => {
                callOrder.push('getRefreshedTokens');

                throw failure;
            });

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toBe(failure);

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revoked
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(callOrder).toEqual([
                'purgeLogins',
                'stagePrepared',
                'getRefreshedTokens',
            ]);
        });
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

        beforeEach(() => {
            onboardingDomain.signUp.mockResolvedValue({
                inputs: [onboardingInput],
                users: [baseUser],
                emailVerification,
            });
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('delegates sign-up to OnboardingDomain, stages the onboarding rows, sends the welcome, and returns an empty envelope', async () => {
            const result = await service.signUp(dto);

            expect(onboardingDomain.signUp).toHaveBeenCalledWith({
                countryId: dto.countryId,
                email: dto.email,
                username: dto.username,
                password: dto.password,
                inviteToken: null,
                name: null,
                from: dto.from,
                cookies: dto.cookies,
                marketing: dto.marketing,
            });
            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.signUp,
                [onboardingInput],
                [baseUser],
                null
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                baseUser,
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
            expect(result).toEqual({});
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

        it('rejects without staging or enqueueing when onboarding throws', async () => {
            const failure = new Error('sign-up failed');
            onboardingDomain.signUp.mockRejectedValue(failure);

            await expect(service.signUp(dto)).rejects.toBe(failure);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcome).not.toHaveBeenCalled();
        });

        it('forwards the name and invite token when the dto carries them', async () => {
            await service.signUp({
                ...dto,
                name: 'Bramble Fox',
                inviteToken: 'invite-bramble',
            });

            expect(onboardingDomain.signUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Bramble Fox',
                    inviteToken: 'invite-bramble',
                })
            );
        });
    });

    describe('logout', () => {
        it('revokes through the composition, purges the session, and stages the logout row', async () => {
            const revoked: ISessionRef[] = [{ id: 'session-bramble' }];
            accountLoginDomain.logout.mockResolvedValue(revoked);
            const callOrder: string[] = [];
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

            expect(accountLoginDomain.logout).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revoked
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLogout,
            });
            expect(callOrder).toEqual(['purgeLogins', 'stagePrepared']);
        });
    });
});
