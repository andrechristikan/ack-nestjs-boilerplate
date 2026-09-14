import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HelperDateService } from '@common/helper/services/helper.date.service';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    type User,
    type Verification,
} from '@generated/prisma-client';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserEmailAlreadyVerifiedException } from '@modules/user/exceptions/user.email-already-verified.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserVerificationEmailResendLimitExceededException } from '@modules/user/exceptions/user.verification-email-resend-limit-exceeded.exception';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import {
    createDatabaseServiceMock,
    mockDatabaseServiceTransaction,
} from '@test/support/database.mock';

describe('UserVerificationDomain', () => {
    const userVerificationRepository = {
        findOneActiveByVerificationEmailToken:
            vi.fn<
                UserVerificationRepository['findOneActiveByVerificationEmailToken']
            >(),
        markUsedInTx: vi.fn<UserVerificationRepository['markUsedInTx']>(),
        findOneLatestByVerificationEmail:
            vi.fn<
                UserVerificationRepository['findOneLatestByVerificationEmail']
            >(),
        expireActiveByTypeInTx:
            vi.fn<UserVerificationRepository['expireActiveByTypeInTx']>(),
        createInTx: vi.fn<UserVerificationRepository['createInTx']>(),
    } satisfies Pick<
        UserVerificationRepository,
        | 'findOneActiveByVerificationEmailToken'
        | 'markUsedInTx'
        | 'findOneLatestByVerificationEmail'
        | 'expireActiveByTypeInTx'
        | 'createInTx'
    >;
    const userRepository = {
        findOneActiveByEmail: vi.fn<UserRepository['findOneActiveByEmail']>(),
        markVerifiedInTx: vi.fn<UserRepository['markVerifiedInTx']>(),
    } satisfies Pick<
        UserRepository,
        'findOneActiveByEmail' | 'markVerifiedInTx'
    >;
    const helperHashService = {
        sha256Hash: vi.fn<HelperHashService['sha256Hash']>(),
    } satisfies Pick<HelperHashService, 'sha256Hash'>;
    const notificationQueue = {
        sendVerifiedEmail: vi.fn<NotificationQueue['sendVerifiedEmail']>(),
        sendVerificationEmail:
            vi.fn<NotificationQueue['sendVerificationEmail']>(),
    } satisfies Pick<
        NotificationQueue,
        'sendVerifiedEmail' | 'sendVerificationEmail'
    >;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
        forward: vi.fn<HelperDateService['forward']>(),
        formatToIso: vi.fn<HelperDateService['formatToIso']>(),
        diff: vi.fn<HelperDateService['diff']>(),
    } satisfies Pick<
        HelperDateService,
        'create' | 'forward' | 'formatToIso' | 'diff'
    >;
    const requestStoreGet = vi.fn((_key: string): unknown => null);
    const requestStoreService = {
        get<T>(key: string): T | null {
            return requestStoreGet(key) as T | null;
        },
    } satisfies Pick<RequestStoreService, 'get'>;
    const configGet = vi.fn((_key: string): unknown => undefined);
    const configService = {
        get<T>(key: string): T | undefined {
            return configGet(key) as T | undefined;
        },
    } satisfies Pick<ConfigService, 'get'>;
    const helperStringService = {
        random: vi.fn<HelperStringService['random']>(),
    } satisfies Pick<HelperStringService, 'random'>;
    const helperNumberService = {
        randomDigits: vi.fn<HelperNumberService['randomDigits']>(),
    } satisfies Pick<HelperNumberService, 'randomDigits'>;
    const helperEncryptionService = {
        aes256EncryptSimple:
            vi.fn<HelperEncryptionService['aes256EncryptSimple']>(),
    } satisfies Pick<HelperEncryptionService, 'aes256EncryptSimple'>;
    const databaseService = createDatabaseServiceMock();
    const activityLogDomain = createMock<ActivityLogDomain>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-01-01T01:00:00.000Z');
    const requestLog = {
        userAgent: { ua: 'browser' },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: false,
        verifiedAt: null,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
    } satisfies User;
    const verification = {
        id: 'verification-id',
        userId: user.id,
        mobileNumberId: null,
        to: user.email,
        type: EnumVerificationType.email,
        token: 'hashed-token',
        expiredAt,
        verifiedAt: null,
        isUsed: false,
        reference: 'VE-RANDOM',
        createdAt: now,
        createdBy: user.id,
    } satisfies Verification;

    let service: UserVerificationDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        mockDatabaseServiceTransaction(databaseService);
        requestStoreGet.mockReturnValue(requestLog);
        configGet.mockImplementation((key: string) => {
            const values = {
                'home.url': 'https://app.example.com',
                'verification.reference.prefix': 'VE',
                'verification.reference.length': 6,
                'verification.otpLength': 6,
                'verification.expiredInMs': 3_600_000,
                'verification.tokenLength': 32,
                'verification.resendInMs': 600_000,
                'verification.linkPattern':
                    '{homeUrl}/verify-email?token={token}',
            };

            return values[key as keyof typeof values];
        });
        helperStringService.random.mockReturnValue('RANDOM');
        helperNumberService.randomDigits.mockReturnValue('123456');
        helperHashService.sha256Hash.mockReturnValue('hashed-token');
        helperEncryptionService.aes256EncryptSimple.mockReturnValue(
            'encrypted-link'
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockReturnValue(expiredAt);
        helperDateService.formatToIso.mockReturnValue(
            '2026-01-01T01:00:00.000Z'
        );
        helperDateService.diff.mockReturnValue(
            Duration.fromObject({ minutes: 9 })
        );
        userRepository.findOneActiveByEmail.mockResolvedValue(user);
        userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
            verification
        );
        userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
            null
        );
        userVerificationRepository.createInTx.mockResolvedValue(verification);
        userVerificationRepository.markUsedInTx.mockResolvedValue(verification);

        const moduleRef: TestingModule = await Test.createTestingModule({
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
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
                { provide: HelperNumberService, useValue: helperNumberService },
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
            ],
        }).compile();
        service = moduleRef.get(UserVerificationDomain);
    });

    describe('verificationCreateVerification', () => {
        it('creates an encrypted email verification link', () => {
            const result = service.verificationCreateVerification(
                user.id,
                EnumVerificationType.email
            );

            expect(result).toMatchObject({
                type: EnumVerificationType.email,
                reference: 'VE-RANDOM',
                token: 'RANDOM',
                hashedToken: 'hashed-token',
                expiredAt,
                expiredInMinutes: 60,
                resendInMinutes: 10,
                link: 'https://app.example.com/verify-email?token=RANDOM',
                encryptedLink: 'encrypted-link',
            });
            expect(
                helperEncryptionService.aes256EncryptSimple
            ).toHaveBeenCalledWith(
                'https://app.example.com/verify-email?token=RANDOM',
                user.id
            );
        });

        it('creates an OTP verification for a mobile number', () => {
            const result = service.verificationCreateVerification(
                user.id,
                EnumVerificationType.mobileNumber
            );

            expect(result).toEqual({
                type: EnumVerificationType.mobileNumber,
                reference: 'VE-RANDOM',
                token: '123456',
                hashedToken: 'hashed-token',
                expiredAt,
                expiredInMinutes: 60,
                resendInMinutes: 10,
            });
            expect(
                helperEncryptionService.aes256EncryptSimple
            ).not.toHaveBeenCalled();
        });
    });

    describe('markUsedInTx', () => {
        it('consumes a valid email verification token and sends the confirmation notification', async () => {
            await service.verifyEmail('plain-token');

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith(
                'plain-token'
            );
            expect(
                userVerificationRepository.findOneActiveByVerificationEmailToken
            ).toHaveBeenCalledWith('hashed-token');
            expect(
                userVerificationRepository.markUsedInTx
            ).toHaveBeenCalledWith(
                expect.any(Object),
                verification.id,
                expect.any(Date)
            );
            expect(notificationQueue.sendVerifiedEmail).toHaveBeenCalledWith(
                user.id,
                { reference: verification.reference }
            );
        });

        it('throws UserTokenInvalidException when the token is absent or expired', async () => {
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                null
            );

            await expect(
                service.verifyEmail('plain-token')
            ).rejects.toBeInstanceOf(UserTokenInvalidException);
            expect(
                userVerificationRepository.markUsedInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('sendVerificationEmail', () => {
        it('stores a new email verification and sends the encrypted link', async () => {
            await service.sendVerificationEmail(user.email);

            expect(userRepository.findOneActiveByEmail).toHaveBeenCalledWith(
                user.email
            );
            expect(userVerificationRepository.createInTx).toHaveBeenCalledWith(
                expect.any(Object),
                user.id,
                user.email,
                expect.objectContaining({
                    type: EnumVerificationType.email,
                    reference: 'VE-RANDOM',
                    hashedToken: 'hashed-token',
                    encryptedLink: 'encrypted-link',
                }),
                expect.any(Date)
            );
            expect(
                notificationQueue.sendVerificationEmail
            ).toHaveBeenCalledWith(user.id, {
                expiredAt: '2026-01-01T01:00:00.000Z',
                reference: 'VE-RANDOM',
                link: 'encrypted-link',
                expiredInMinutes: 60,
            });
        });

        it('throws UserNotFoundException when the email is unknown', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await expect(
                service.sendVerificationEmail(user.email)
            ).rejects.toBeInstanceOf(UserNotFoundException);
            expect(
                userVerificationRepository.createInTx
            ).not.toHaveBeenCalled();
        });

        it('throws UserEmailAlreadyVerifiedException when the email is already verified', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue({
                ...user,
                isVerified: true,
                verifiedAt: now,
            });

            await expect(
                service.sendVerificationEmail(user.email)
            ).rejects.toBeInstanceOf(UserEmailAlreadyVerifiedException);
            expect(
                userVerificationRepository.createInTx
            ).not.toHaveBeenCalled();
        });

        it('throws UserVerificationEmailResendLimitExceededException inside the resend window', async () => {
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                verification
            );
            helperDateService.forward.mockReturnValue(
                new Date('2026-01-01T01:00:00.000Z')
            );

            await expect(
                service.sendVerificationEmail(user.email)
            ).rejects.toBeInstanceOf(
                UserVerificationEmailResendLimitExceededException
            );
            expect(
                userVerificationRepository.createInTx
            ).not.toHaveBeenCalled();
        });
    });
});
