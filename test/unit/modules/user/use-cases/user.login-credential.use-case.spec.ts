import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
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
    IUserAuthOutcome,
    IUserAuthMfaChallenge,
    IUserPasswordAttemptLimit,
} from '@modules/user/interfaces/user.interface';
import type { IUserAuthSession } from '@modules/user/interfaces/user.auth.interface';
import { buildMfaFactorState } from '@test/unit/helpers/test.unit.mfa.helper';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { UserLoginCredentialUseCase } from '@modules/user/use-cases/user.login-credential.use-case';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';

describe('UserLoginCredentialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userPasswordService: MockProxy<UserPasswordService> =
        mock<UserPasswordService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx = {} as IDatabaseTransactionClient;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    let useCase: UserLoginCredentialUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const tokenOutcome: IUserAuthOutcome = {
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
        ...buildUser('user-bramble', 'bramble@example.com'),
        isVerified: true,
    };
    const passkeyOptions: PublicKeyCredentialRequestOptionsJSON = {
        challenge: 'challenge-webauthn',
    };
    const factorState = buildMfaFactorState('user-bramble');
    const mfaChallenge: IUserAuthMfaChallenge = {
        challengeToken: 'challenge-token',
        expiresInMs: 60000,
        methods: [EnumMfaMethod.passkey, EnumMfaMethod.backupCode],
        passkeyOptions,
    };
    const upserted = {
        device: { id: 'device-one' },
        deviceOwnership: { id: 'ownership-one' },
        isNewDevice: true,
        otherOwnershipIds: [],
    } as unknown as IDeviceLoginUpsert;
    const session: IUserAuthSession = {
        tokens,
        sessionId: 'session-bramble',
    };
    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        mfaService.isEnabled.mockResolvedValue(false);
        mfaService.getFactorState.mockResolvedValue(factorState);
        mfaService.getLoginMethods.mockResolvedValue([EnumMfaMethod.totp]);
        deviceService.upsertForLoginInTx.mockResolvedValue(upserted);
        mfaChallengeService.createInTx.mockResolvedValue({
            challengeToken: mfaChallenge.challengeToken,
            expiresInMs: mfaChallenge.expiresInMs,
        });
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
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                UserUtil,
                { provide: MfaService, useValue: mfaService },
                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: DeviceService, useValue: deviceService },
                DeviceUtil,
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                HelperDateService,
                HelperStringService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitUserConfigValues),
                },
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
        const attemptLimit: IUserPasswordAttemptLimit = {
            maxAttempts: 5,
            lockedUntil: new Date('2026-03-01T00:15:00.000Z'),
        };
        const emailNotVerifiedFields = {
            module: 'user',
            statusCode: EnumUserStatusCodeError.emailNotVerified,
        };

        beforeEach(() => {
            userAuthService.getOneForCredentialLogin.mockResolvedValue(counted);
            userAuthService.isCredentialMatch.mockResolvedValue(true);
            userPasswordService.getPasswordAttemptLimit.mockResolvedValue(
                attemptLimit
            );
        });

        it('logs the user in through the service inside one transaction on a repeat device, the login stamp carrying the counter reset', async () => {
            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(mfaService.getLoginMethods).not.toHaveBeenCalled();
            expect(
                mfaPasskeyService.getAssertionOptions
            ).not.toHaveBeenCalled();

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
                userPasswordService.countFailedPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now,
                false,
                true
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                now
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
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

            await useCase.execute(requestContext, apiKeyContext, {
                ...dto,
                device: requestDevice,
            });

            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                now,
                false,
                true
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                fullDevice,
                now
            );
        });

        it('counts the mismatch, adds the failed-login entry through OutboxService.addInTx, and answers the credential error below the budget', async () => {
            const failure = new UserCredentialInvalidException();
            userAuthService.isCredentialMatch.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttemptInTx.mockResolvedValue(
                false
            );
            userAuthService.assertCredentialMatched.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toBe(failure);

            expect(
                userPasswordService.getPasswordAttemptLimit
            ).toHaveBeenCalledTimes(1);
            expect(
                userPasswordService.countFailedPasswordAttemptInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                'user-bramble',
                attemptLimit
            );
            expect(
                userPasswordService.assertPasswordNotLocked
            ).toHaveBeenCalledWith(false);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                {
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: 'user-bramble',
                    createdBy: 'user-bramble',
                }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(
                userPasswordService.countFailedPasswordAttemptInTx
            ).toHaveBeenCalledBefore(outboxService.addInTx);
            expect(outboxService.addInTx).toHaveBeenCalledBefore(
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
            userPasswordService.countFailedPasswordAttemptInTx.mockResolvedValue(
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
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.addInTx).toHaveBeenCalledBefore(
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
                userPasswordService.countFailedPasswordAttemptInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('sends a verification email with its entry on one tx and rejects with the unverified error when resendable', async () => {
            const callOrder: string[] = [];
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

            expect(
                userVerificationService.isEmailResendable
            ).toHaveBeenCalledWith(unverifiedUser);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userVerificationService.sendEmailInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'bramble@example.com'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                {
                    action: EnumActivityLogAction.userVerificationEmailSent,
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
                'sendEmailInTx',
                'resetPasswordAttemptInTx',
                'addInTx',
                'assertVerified',
            ]);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
            expect(mfaChallengeService.createInTx).not.toHaveBeenCalled();
        });

        it('rejects with the unverified error and sends nothing inside the resend window', async () => {
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('rejects a wrong password of an unverified user with the credential error and sends nothing', async () => {
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userAuthService.isCredentialMatch.mockResolvedValue(false);
            userPasswordService.countFailedPasswordAttemptInTx.mockResolvedValue(
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
            });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(
                userVerificationService.isEmailResendable
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
        });

        it('rejects an unverified MFA user with the unverified error before any challenge or session', async () => {
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

            expect(mfaChallengeService.createInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('creates the challenge while the attempt counter reset is pending, then answers the challenge', async () => {
            const reset = buildDeferred<void>();
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.getLoginMethods.mockResolvedValue(mfaChallenge.methods);
            mfaPasskeyService.getAssertionOptions.mockResolvedValue(
                passkeyOptions
            );
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: baseUser,
            });
            userPasswordService.resetPasswordAttemptInTx.mockReturnValue(
                reset.promise
            );

            const running = useCase.execute(requestContext, apiKeyContext, dto);
            await vi.advanceTimersByTimeAsync(0);

            expect(mfaChallengeService.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-bramble',
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                webAuthnChallenge: 'challenge-webauthn',
            });

            reset.resolve();

            await expect(running).resolves.toMatchObject({
                data: { isMfaRequired: true, mfa: mfaChallenge },
            });
        });

        it('resets the attempt counter while the verification email is still being sent, then adds its entry', async () => {
            const sent = buildDeferred<void>();
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: unverifiedUser,
            });
            userVerificationService.isEmailResendable.mockResolvedValue(true);
            userVerificationService.sendEmailInTx.mockReturnValue(sent.promise);
            userAuthService.assertVerified.mockImplementation(() => {
                throw new UserEmailNotVerifiedException();
            });

            const running = useCase.execute(requestContext, apiKeyContext, dto);
            await vi.advanceTimersByTimeAsync(0);

            expect(userVerificationService.sendEmailInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'bramble@example.com'
            );
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble');
            expect(outboxService.addInTx).not.toHaveBeenCalled();

            sent.resolve();

            await expect(running).rejects.toMatchObject(emailNotVerifiedFields);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('answers methods without passkey and null passkeyOptions for a TOTP-only user', async () => {
            const totpChallenge: IUserAuthMfaChallenge = {
                ...mfaChallenge,
                methods: [EnumMfaMethod.totp, EnumMfaMethod.backupCode],
                passkeyOptions: null,
            };
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.getFactorState.mockResolvedValue({
                ...factorState,
                passkeys: [],
            });
            mfaService.getLoginMethods.mockResolvedValue(totpChallenge.methods);
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: baseUser,
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toMatchObject({
                data: { isMfaRequired: true, mfa: totpChallenge },
            });
            expect(mfaService.getLoginMethods).toHaveBeenCalledWith({
                ...factorState,
                passkeys: [],
            });
            expect(
                mfaPasskeyService.getAssertionOptions
            ).not.toHaveBeenCalled();
            expect(mfaChallengeService.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-bramble',
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                webAuthnChallenge: null,
            });
        });

        it('creates a challenge with the passed context and issues nothing for an MFA user', async () => {
            mfaService.isEnabled.mockResolvedValue(true);
            mfaService.getLoginMethods.mockResolvedValue(mfaChallenge.methods);
            mfaPasskeyService.getAssertionOptions.mockResolvedValue(
                passkeyOptions
            );
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: baseUser,
            });

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
            expect(mfaService.getFactorState).toHaveBeenCalledTimes(1);
            expect(mfaService.getFactorState).toHaveBeenCalledWith(
                'user-bramble'
            );
            expect(mfaService.isEnabled).toHaveBeenCalledWith(factorState);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userPasswordService.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble');
            expect(mfaService.getLoginMethods).toHaveBeenCalledWith(
                factorState
            );
            expect(mfaPasskeyService.getAssertionOptions).toHaveBeenCalledWith(
                factorState.passkeys
            );
            expect(mfaChallengeService.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: 'user-bramble',
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                webAuthnChallenge: 'challenge-webauthn',
            });
            expect(mfaService.getFactorState).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
            expect(mfaService.getLoginMethods).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
            expect(
                mfaPasskeyService.getAssertionOptions
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
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
            mfaService.getLoginMethods.mockResolvedValue(mfaChallenge.methods);
            mfaPasskeyService.getAssertionOptions.mockResolvedValue(
                passkeyOptions
            );
            userAuthService.getOneForCredentialLogin.mockResolvedValue({
                ...counted,
                user: { ...baseUser, ...lastWorkspace },
            });

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
            ).toHaveBeenCalledBefore(mfaChallengeService.createInTx);
        });
    });
});
