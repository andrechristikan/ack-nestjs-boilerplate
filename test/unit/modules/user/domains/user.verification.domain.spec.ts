import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type {
    IUser,
    IUserOnboardingVerification,
    IUserVerificationCreate,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { Duration } from 'luxon';

describe('UserVerificationDomain', () => {
    const userVerificationRepository: MockProxy<UserVerificationRepository> =
        mock<UserVerificationRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: UserVerificationDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const event: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.userSendVerificationEmail,
        metadata: {},
        onError: false,
    };

    const configValues: Record<string, string | number> = {
        'home.url': 'https://example.com',
        'verification.reference.prefix': 'VRF',
        'verification.reference.length': 8,
        'verification.otpLength': 6,
        'verification.expiredInMs': 15 * 60 * 1000,
        'verification.tokenLength': 32,
        'verification.resendInMs': 5 * 60 * 1000,
        'verification.linkPattern': '{homeUrl}/verify?token={token}',
    };

    const baseUser: IUser = {
        id: 'user-flint',
        name: 'Flint Ashford',
        username: 'flintAshford',
        isVerified: false,
        verifiedAt: null,
        email: 'flint@example.com',
        roleId: 'role-flint',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-flint',
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
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-flint',
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

    const verification: Verification = {
        id: 'verification-flint',
        userId: 'user-flint',
        mobileNumberId: null,
        to: 'flint@example.com',
        type: EnumVerificationType.email,
        token: 'hashed-token',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        verifiedAt: null,
        isUsed: false,
        reference: 'VRF-flint',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation(key => configValues[key]);
        activityLogDomain.prepare.mockReturnValue(event);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(
            (date, duration: Duration) =>
                new Date(date.getTime() + duration.as('milliseconds'))
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationDomain,
                {
                    provide: UserVerificationRepository,
                    useValue: userVerificationRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                {
                    provide: HelperNumberService,
                    useValue: helperNumberService,
                },
            ],
        }).compile();
        domain = module.get(UserVerificationDomain);
    });

    describe('verificationCreateReference', () => {
        it('builds a prefixed random reference', () => {
            helperStringService.random.mockReturnValue('random-ref');

            expect(domain.verificationCreateReference()).toBe('VRF-random-ref');
            expect(helperStringService.random).toHaveBeenCalledWith(8);
        });
    });

    describe('verificationCreateOtp', () => {
        it('builds a random numeric code of the configured length', () => {
            helperNumberService.randomDigits.mockReturnValue('123456');

            expect(domain.verificationCreateOtp()).toBe('123456');
            expect(helperNumberService.randomDigits).toHaveBeenCalledWith(6);
        });
    });

    describe('verificationCreateToken', () => {
        it('builds a random token of the configured length', () => {
            helperStringService.random.mockReturnValue('random-token');

            expect(domain.verificationCreateToken()).toBe('random-token');
            expect(helperStringService.random).toHaveBeenCalledWith(32);
        });
    });

    describe('verificationSetExpiredDate', () => {
        it('forwards now by the configured expiry', () => {
            const result = domain.verificationSetExpiredDate();

            expect(result).toEqual(new Date(now.getTime() + 15 * 60 * 1000));
        });
    });

    describe('verificationCreateVerification', () => {
        it('builds an OTP verification for a mobile number', () => {
            helperNumberService.randomDigits.mockReturnValue('654321');
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
            helperStringService.random.mockReturnValue('random-ref');

            const result = domain.verificationCreateVerification(
                EnumVerificationType.mobileNumber
            );

            expect(result).toEqual({
                reference: 'VRF-random-ref',
                expiredAt: new Date(now.getTime() + 15 * 60 * 1000),
                type: EnumVerificationType.mobileNumber,
                token: '654321',
                hashedToken: 'hashed-otp',
                expiredInMinutes: 15,
                resendInMinutes: 5,
            });
        });

        it('builds a tokenized link verification for email', () => {
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/verify?token=random-token'
            );

            const result = domain.verificationCreateVerification(
                EnumVerificationType.email
            );

            expect(result).toEqual({
                reference: 'VRF-random-token',
                expiredAt: new Date(now.getTime() + 15 * 60 * 1000),
                type: EnumVerificationType.email,
                token: 'random-token',
                hashedToken: 'hashed-token',
                expiredInMinutes: 15,
                link: 'https://example.com/verify?token=random-token',
                resendInMinutes: 5,
            });
        });
    });

    describe('verifyEmail', () => {
        it('marks the verification and the user verified, then notifies', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );

            await domain.verifyEmail('raw-token');

            expect(
                userVerificationRepository.findOneActiveByVerificationEmailToken
            ).toHaveBeenCalledWith('hashed-token');
            expect(
                userVerificationRepository.markUsedInTx
            ).toHaveBeenCalledWith(tx, verification.id, now);
            expect(userRepository.markVerifiedInTx).toHaveBeenCalledWith(
                tx,
                verification.userId,
                now
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(notificationQueue.sendVerifiedEmail).toHaveBeenCalledWith(
                verification.userId,
                { reference: verification.reference }
            );
        });

        it('throws UserTokenInvalidException when the token is unknown', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                null
            );

            await expect(domain.verifyEmail('raw-token')).rejects.toMatchObject(
                {
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.tokenInvalid,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.tokenInvalid
                        ],
                    messagePath: 'user.error.verificationTokenInvalid',
                }
            );
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.verifyEmail('raw-token');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.verifyEmail('raw-token');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('sendVerificationEmail', () => {
        it('creates the verification and notifies when there is no previous one', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                null
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/verify?token=random-token'
            );

            await domain.sendVerificationEmail('flint@example.com');

            expect(
                userVerificationRepository.createReplacingActive
            ).toHaveBeenCalledWith(
                'user-flint',
                'flint@example.com',
                expect.objectContaining({ reference: 'VRF-random-token' }),
                now
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
            expect(notificationQueue.sendVerificationEmail).toHaveBeenCalled();
        });

        it('sends again when the previous verification is past its resend window', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                {
                    ...verification,
                    createdAt: new Date(now.getTime() - 60 * 60 * 1000),
                }
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/verify?token=random-token'
            );

            await domain.sendVerificationEmail('flint@example.com');

            expect(
                userVerificationRepository.createReplacingActive
            ).toHaveBeenCalled();
        });

        it('throws UserNotFoundException when the user is missing', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            const call = domain.sendVerificationEmail('missing@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserEmailAlreadyVerifiedException when the user is already verified', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: true,
            });

            const call = domain.sendVerificationEmail('flint@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailAlreadyVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.emailAlreadyVerified
                    ],
                messagePath: 'user.error.emailAlreadyVerified',
            });
        });

        it('throws UserVerificationEmailResendLimitExceededException when resent too soon', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                {
                    ...verification,
                    createdAt: new Date(now.getTime() - 30_000),
                }
            );
            helperDateService.diff.mockImplementation((from, to) =>
                Duration.fromMillis(from.getTime() - to.getTime())
            );

            await expect(
                domain.sendVerificationEmail('flint@example.com')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.verificationEmailResendLimitExceeded,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError
                            .verificationEmailResendLimitExceeded
                    ],
                messagePath: 'user.error.verificationEmailResendLimitExceeded',
                messageProperties: { minutes: 15 },
            });
        });

        it('rethrows an AppBaseException raised while creating the verification', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                null
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/verify?token=random-token'
            );

            const error = new UserNotFoundException();
            userVerificationRepository.createReplacingActive.mockRejectedValue(
                error
            );

            const call = domain.sendVerificationEmail('flint@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised while creating the verification', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                null
            );
            helperStringService.random.mockReturnValue('random-token');
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            helperStringService.fillPattern.mockReturnValue(
                'https://example.com/verify?token=random-token'
            );

            const error = new Error('boom');
            userVerificationRepository.createReplacingActive.mockRejectedValue(
                error
            );

            const call = domain.sendVerificationEmail('flint@example.com');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('markVerified', () => {
        it('marks the user verified and stages the activity log event', async () => {
            await domain.markVerified('user-flint');

            expect(userRepository.markVerified).toHaveBeenCalledWith(
                'user-flint',
                now
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });
    });

    describe('persistVerificationEmail', () => {
        it('persists the verification and stages the activity log event', async () => {
            const emailVerification: IUserVerificationCreate = {
                reference: 'VRF-random-token',
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
                type: EnumVerificationType.email,
                token: 'random-token',
                hashedToken: 'hashed-token',
                expiredInMinutes: 15,
                link: 'https://example.com/verify?token=random-token',
                resendInMinutes: 5,
            };

            await domain.persistVerificationEmail(
                'user-flint',
                'flint@example.com',
                emailVerification
            );

            expect(
                userVerificationRepository.createReplacingActive
            ).toHaveBeenCalledWith(
                'user-flint',
                'flint@example.com',
                emailVerification,
                now
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                event,
            ]);
        });
    });

    describe('createFromOnboardingInTx', () => {
        it('delegates to the repository', async () => {
            const onboardingVerification: IUserOnboardingVerification = {
                reference: 'VRF-onboarding',
                token: 'hashed-token',
                type: EnumVerificationType.email,
                to: 'flint@example.com',
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
                verifiedAt: null,
                isUsed: false,
            };
            userVerificationRepository.createFromOnboardingInTx.mockResolvedValue(
                verification
            );

            await expect(
                domain.createFromOnboardingInTx(
                    tx,
                    'user-flint',
                    onboardingVerification,
                    'admin-flint'
                )
            ).resolves.toBe(verification);
            expect(
                userVerificationRepository.createFromOnboardingInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-flint',
                onboardingVerification,
                'admin-flint'
            );
        });
    });
});
