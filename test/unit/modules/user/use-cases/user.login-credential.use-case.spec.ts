import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserCredentialInvalidException } from '@modules/user/exceptions/user.credential-invalid.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import type {
    IUser,
    IUserLoginOutcome,
    IUserLoginMfaChallenge,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSession } from '@modules/user/interfaces/user.login.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLoginCredentialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    let useCase: UserLoginCredentialUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
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
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
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
    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userUtil.isUnverified.mockReturnValue(false);
        mfaService.isEnabled.mockResolvedValue(false);
        deviceUtil.toIdentity.mockReturnValue(deviceIdentity);
        userAuthService.createTokenAndSessionInTx.mockResolvedValue(session);
        workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginCredentialUseCase,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserPasswordService, useValue: userPasswordService },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: UserUtil, useValue: userUtil },
                { provide: MfaService, useValue: mfaService },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(UserLoginCredentialUseCase);
    });

    describe('execute', () => {
        const dto: UserLoginRequestDto = {
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plain-password',
            from: EnumUserLoginFrom.website,
            device,
        };
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
        };
        const lastWorkspace = {
            lastWorkspaceId: 'workspace-stale',
            lastWorkspaceChangedAt: new Date('2026-02-01T00:00:00.000Z'),
        };
        const unverifiedUser: IUser = { ...baseUser, isVerified: false };
        const emailNotVerifiedFields = {
            module: 'user',
            statusCode: EnumUserStatusCodeError.emailNotVerified,
            statusCodeKey:
                EnumUserStatusCodeError[
                    EnumUserStatusCodeError.emailNotVerified
                ],
            messagePath: 'user.error.emailNotVerified',
        };

        beforeEach(() => {
            userAuthService.getOneForCredentialLogin.mockResolvedValue(counted);
            userAuthService.isCredentialMatch.mockResolvedValue(true);
        });

        it('logs the user in through the service inside one transaction on a repeat device, resetting the counter on that transaction first', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(
                userAuthService.getOneForCredentialLogin
            ).toHaveBeenCalledWith(dto.email);
            expect(
                userPasswordService.assertPasswordAttemptAvailable
            ).toHaveBeenCalledWith(baseUser);
            expect(userAuthService.isCredentialMatch).toHaveBeenCalledWith(
                counted,
                dto.password
            );
            expect(
                userAuthService.assertCredentialMatched
            ).toHaveBeenCalledWith(true);
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble');
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledBefore(userAuthService.createTokenAndSessionInTx);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
            expect(outboxService.add).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('rejects with the session failure of the one transaction', async () => {
            const failure = new Error('tx failed');
            userAuthService.createTokenAndSessionInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);
        });

        it('logs in on the device identity DeviceUtil shapes from the request device', async () => {
            const requestDevice: DeviceRequestDto = {
                fingerprint: 'device-bramble',
                name: 'Bramble phone',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-bramble',
            };
            const fullDevice: IDeviceIdentity = {
                fingerprint: 'device-bramble',
                name: 'Bramble phone',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-bramble',
            };
            deviceUtil.toIdentity.mockReturnValue(fullDevice);

            await useCase.execute(requestContext, apiKeyContext, {
                ...dto,
                device: requestDevice,
            });

            expect(deviceUtil.toIdentity).toHaveBeenCalledWith(requestDevice);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                fullDevice,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now
            );
        });

        it('counts the mismatch, adds the failed-login entry through OutboxService.add, and answers the credential error below the budget', async () => {
            const failure = new UserCredentialInvalidException();
            userAuthService.isCredentialMatch.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttempt.mockResolvedValue(
                false
            );
            userAuthService.assertCredentialMatched.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(
                userPasswordService.countFailedPasswordAttempt
            ).toHaveBeenCalledWith(requestContext, apiKeyContext, baseUser);
            expect(
                userPasswordService.assertPasswordNotLocked
            ).toHaveBeenCalledWith(false);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(outboxService.add).toHaveBeenCalledWith(entryEffect);
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).toHaveBeenCalledBefore(outboxService.add);
            expect(outboxService.add).toHaveBeenCalledBefore(
                userAuthService.assertCredentialMatched
            );
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('adds the failed-login entry and answers the attempt limit when the counted mismatch locked the account', async () => {
            const failure = new UserPasswordAttemptMaxException();
            userAuthService.isCredentialMatch.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttempt.mockResolvedValue(
                true
            );
            userPasswordService.assertPasswordNotLocked.mockImplementation(
                () => {
                    throw failure;
                }
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(
                userPasswordService.assertPasswordNotLocked
            ).toHaveBeenCalledWith(true);
            expect(outboxService.add).toHaveBeenCalledWith(entryEffect);
            expect(outboxService.add).toHaveBeenCalledBefore(
                userPasswordService.assertPasswordNotLocked
            );
            expect(
                userAuthService.assertCredentialMatched
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('answers the attempt limit of a locked account without comparing, counting, or adding an entry', async () => {
            const failure = new UserPasswordAttemptMaxException();
            userPasswordService.assertPasswordAttemptAvailable.mockImplementation(
                () => {
                    throw failure;
                }
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(userAuthService.isCredentialMatch).not.toHaveBeenCalled();
            expect(
                userPasswordService.countFailedPasswordAttempt
            ).not.toHaveBeenCalled();
            expect(outboxService.add).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('sends a verification email with its entry on one tx and rejects with the unverified error when resendable', async () => {
            const callOrder: string[] = [];
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userAuthService.isCredentialMatch.mockImplementation(async () => {
                callOrder.push('isCredentialMatch');

                return true;
            });
            userVerificationService.isEmailResendable.mockImplementation(
                async () => {
                    callOrder.push('isEmailResendable');

                    return true;
                }
            );
            userPasswordService.resetPasswordAttemptInTx.mockImplementation(
                async () => {
                    callOrder.push('resetPasswordAttemptInTx');
                }
            );
            userVerificationService.sendEmailInTx.mockImplementation(
                async () => {
                    callOrder.push('sendEmailInTx');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });
            userAuthService.assertVerified.mockImplementation(() => {
                callOrder.push('assertVerified');

                throw new UserEmailNotVerifiedException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(userUtil.isUnverified).toHaveBeenCalledWith(unverifiedUser);
            expect(
                userVerificationService.isEmailResendable
            ).toHaveBeenCalledWith(unverifiedUser);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userVerificationService.sendEmailInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'bramble@example.com'
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSendVerificationEmail,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(userAuthService.assertVerified).toHaveBeenCalledWith(
                unverifiedUser
            );
            expect(callOrder).toEqual([
                'isCredentialMatch',
                'isEmailResendable',
                'resetPasswordAttemptInTx',
                'sendEmailInTx',
                'addInTx',
                'assertVerified',
            ]);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createMfaChallengeInTx
            ).not.toHaveBeenCalled();
        });

        it('rejects with the unverified error and sends nothing inside the resend window', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userVerificationService.isEmailResendable.mockResolvedValue(false);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(
                userVerificationService.isEmailResendable
            ).toHaveBeenCalledWith(unverifiedUser);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.assertVerified).toHaveBeenCalledWith(
                unverifiedUser
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('sends the verification email before the expiry check for an unverified user with an expired password', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userVerificationService.isEmailResendable.mockResolvedValue(true);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });
            userAuthService.assertPasswordNotExpired.mockImplementation(() => {
                throw new UserPasswordExpiredException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(userVerificationService.sendEmailInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'bramble@example.com'
            );
            expect(
                userAuthService.assertPasswordNotExpired
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('skips the send for a verified user', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(userUtil.isUnverified).toHaveBeenCalledWith(baseUser);
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.assertVerified).toHaveBeenCalledWith(
                baseUser
            );
            expect(
                userAuthService.assertPasswordNotExpired
            ).toHaveBeenCalledWith(baseUser);
            expect(
                userAuthService.assertPasswordNotExpired
            ).toHaveBeenCalledBefore(userAuthService.createTokenAndSessionInTx);
        });

        it('rejects an expired password with no transaction and no counter reset', async () => {
            userAuthService.assertPasswordNotExpired.mockImplementation(() => {
                throw new UserPasswordExpiredException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBeInstanceOf(UserPasswordExpiredException);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('rejects a wrong password of an unverified user with the credential error and sends nothing', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userAuthService.isCredentialMatch.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttempt.mockResolvedValue(
                false
            );
            userAuthService.assertCredentialMatched.mockImplementation(() => {
                throw new UserCredentialInvalidException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.credentialInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.credentialInvalid
                    ],
                messagePath: 'user.error.credentialInvalid',
            });

            expect(outboxService.add).toHaveBeenCalledWith(entryEffect);
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
        });

        it('rejects an unverified MFA user with the unverified error before any challenge or session', async () => {
            userUtil.isUnverified.mockReturnValue(true);
            mfaService.isEnabled.mockResolvedValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: { ...baseUser, isVerified: false },
            });
            userVerificationService.isEmailResendable.mockResolvedValue(false);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject(emailNotVerifiedFields);

            expect(
                userAuthService.createMfaChallengeInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('answers methods without passkey and null passkeyOptions for a TOTP-only user', async () => {
            const totpChallenge: IUserLoginMfaChallenge = {
                ...mfaChallenge,
                methods: [EnumMfaMethod.totp, EnumMfaMethod.backupCode],
                passkeyOptions: null,
            };
            mfaService.isEnabled.mockResolvedValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: baseUser,
            });
            userAuthService.createMfaChallengeInTx.mockResolvedValue(
                totpChallenge
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toMatchObject({
                data: { isMfaRequired: true, mfa: totpChallenge },
            });
        });

        it('creates a challenge with the passed context and issues nothing for an MFA user', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: baseUser,
            });
            userAuthService.createMfaChallengeInTx.mockResolvedValue(
                mfaChallenge
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    isMfaRequired: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    mfa: mfaChallenge,
                },
            });
            expect(mfaService.isEnabled).toHaveBeenCalledWith('user-bramble');
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble');
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledBefore(userAuthService.createMfaChallengeInTx);
            expect(userAuthService.createMfaChallengeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('returns the resolved lastWorkspaceId on the token outcome', async () => {
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: { ...baseUser, ...lastWorkspace },
            });
            workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(
                'workspace-resolved'
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    ...tokenOutcome,
                    lastWorkspaceId: 'workspace-resolved',
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
        });

        it('returns the resolved lastWorkspaceId on the MFA outcome', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: { ...baseUser, ...lastWorkspace },
            });
            userAuthService.createMfaChallengeInTx.mockResolvedValue(
                mfaChallenge
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: {
                    isMfaRequired: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                    mfa: mfaChallenge,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledBefore(userAuthService.createMfaChallengeInTx);
        });
    });
});
