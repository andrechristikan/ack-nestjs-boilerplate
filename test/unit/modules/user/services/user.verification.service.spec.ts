import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    buildApiKeyContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type {
    INotificationReauthenticationOtpContext,
    INotificationVerificationLinkContext,
    INotificationVerificationMobileNumberContext,
} from '@modules/notification/interfaces/notification.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserVerificationEmailCreate,
    IUserVerificationWithUser,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { HelperStringService } from '@common/helper/services/helper.string.service';

describe('UserVerificationService', () => {
    const userVerificationRepository: MockProxy<UserVerificationRepository> =
        mock<UserVerificationRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const entry = buildActivityLogCreateManyEffect('activityLog');
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();

    let service: UserVerificationService;
    let helperStringService: HelperStringService;
    let helperNumberService: HelperNumberService;
    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
        'verification.otpLength': 6,
        'verification.expiresInMinutes': 5,
        'verification.resendInMinutes': 7,
        'verification.retentionInMs': 7776000000,
    };

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');

    const baseUser: IUser = buildUser('user-flint', 'flint@example.com');

    const verification: Verification = {
        id: 'verification-flint',
        userId: 'user-flint',
        mobileNumberId: null,
        to: 'flint@example.com',
        type: EnumVerificationType.email,
        action: null,
        token: 'hashed-token',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        verifiedAt: null,
        isUsed: false,
        reference: 'VRF-flint',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.verifiedEmail,
            context: {
                userId: 'user-flint',
                proceedBy: 'user-flint',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'verifiedEmail-VRF-flint',
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(entry);
        notificationQueue.notify.mockReturnValue(notifyEffect);
        userRepository.findOneById.mockResolvedValue(baseUser);
        userRepository.markVerifiedInTx.mockResolvedValue(baseUser);
        userVerificationRepository.markUsedInTx.mockResolvedValue(true);

        vi.setSystemTime(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationService,
                {
                    provide: UserVerificationRepository,
                    useValue: userVerificationRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                HelperHashService,
                HelperDateService,
                HelperNumberService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
                UserUtil,
                UserVerificationUtil,
                HelperStringService,
            ],
        }).compile();
        service = module.get(UserVerificationService);
        helperStringService = module.get(HelperStringService);
        helperNumberService = module.get(HelperNumberService);
    });

    describe('getOneActiveByEmailToken', () => {
        const verificationWithUser: IUserVerificationWithUser = {
            ...verification,
            user: baseUser,
        };

        it('returns the active verification of the hashed token with its included user after one repository call', async () => {
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verificationWithUser
            );

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).resolves.toEqual({ verification, user: baseUser });

            expect(
                userVerificationRepository.findOneActiveByVerificationEmailToken
            ).toHaveBeenCalledTimes(1);
            expect(
                userVerificationRepository.findOneActiveByVerificationEmailToken
            ).toHaveBeenCalledWith(
                '34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943'
            );
            expect(userRepository.findOneById).not.toHaveBeenCalled();
        });

        it('throws UserTokenInvalidException when the token is unknown', async () => {
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                null
            );

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
        });

        it('throws UserEmailAlreadyVerifiedException when the user is already verified', async () => {
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                {
                    ...verificationWithUser,
                    user: { ...baseUser, isVerified: true },
                }
            );

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailAlreadyVerified,
            });
        });
    });

    describe('verifyEmailInTx', () => {
        it('marks the verification and the user verified and adds the verifiedEmail effect and the entry on the given tx', async () => {
            await service.verifyEmailInTx(
                tx,
                requestContext,
                apiKeyContext,
                verification
            );

            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.verifiedEmail,
                {
                    userId: 'user-flint',
                    proceedBy: 'user-flint',
                    reference: 'VRF-flint',
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userEmailVerified,
                    userId: 'user-flint',
                    createdBy: 'user-flint',
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entry,
                notifyEffect,
            ]);
            expect(userRepository.markVerifiedInTx).toHaveBeenCalledBefore(
                outboxService.addManyInTx
            );
            expect(
                userVerificationRepository.markUsedInTx
            ).toHaveBeenCalledWith(
                tx,
                verification.id,
                now,
                verification.userId
            );
            expect(userRepository.markVerifiedInTx).toHaveBeenCalledWith(
                tx,
                verification.userId,
                now
            );
        });

        it('throws UserTokenInvalidException when the token was already used', async () => {
            userVerificationRepository.markUsedInTx.mockResolvedValue(false);

            const call = service.verifyEmailInTx(
                tx,
                requestContext,
                apiKeyContext,
                verification
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
            expect(userRepository.markVerifiedInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('isEmailResendable', () => {
        it('returns false for a verified user', async () => {
            await expect(
                service.isEmailResendable({ ...baseUser, isVerified: true })
            ).resolves.toBe(false);

            expect(
                userVerificationRepository.findOneLatestByVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('returns true when no verification email exists', async () => {
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                null
            );

            await expect(service.isEmailResendable(baseUser)).resolves.toBe(
                true
            );

            expect(
                userVerificationRepository.findOneLatestByVerificationEmail
            ).toHaveBeenCalledWith('user-flint');
        });

        it('returns false inside the resend window', async () => {
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                { ...verification, createdAt: now }
            );

            await expect(service.isEmailResendable(baseUser)).resolves.toBe(
                false
            );
        });

        it('returns true outside the resend window', async () => {
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                verification
            );

            await expect(service.isEmailResendable(baseUser)).resolves.toBe(
                true
            );
        });
    });

    describe('getOneForResendByEmail', () => {
        it('returns null when no active user holds the email', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(null);

            await expect(
                service.getOneForResendByEmail('missing@example.com')
            ).resolves.toBeNull();

            expect(
                userVerificationRepository.findOneLatestByVerificationEmail
            ).not.toHaveBeenCalled();
        });

        it('returns the user when the resend gate holds', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                null
            );

            await expect(
                service.getOneForResendByEmail('flint@example.com')
            ).resolves.toBe(baseUser);

            expect(userRepository.findOneActiveByEmail).toHaveBeenCalledWith(
                'flint@example.com'
            );
            expect(
                userVerificationRepository.findOneLatestByVerificationEmail
            ).toHaveBeenCalledWith('user-flint');
        });

        it('returns null when the resend gate does not hold', async () => {
            userRepository.findOneActiveByEmail.mockResolvedValue(baseUser);
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                { ...verification, createdAt: now }
            );

            await expect(
                service.getOneForResendByEmail('flint@example.com')
            ).resolves.toBeNull();

            expect(
                userVerificationRepository.findOneLatestByVerificationEmail
            ).toHaveBeenCalledWith('user-flint');
        });
    });

    describe('markVerifiedBySocialInTx', () => {
        it('marks the user verified on the given tx and returns the written row', async () => {
            const writtenRow = {
                ...baseUser,
                isVerified: true,
                verifiedAt: now,
                password: null,
                passwordCreated: null,
                passwordExpired: null,
                passwordAttempt: 0,
                passwordLockedUntil: null,
            };
            userRepository.markVerifiedBySocialInTx.mockResolvedValue(
                writtenRow
            );

            await expect(
                service.markVerifiedBySocialInTx(tx, 'user-flint')
            ).resolves.toBe(writtenRow);
            expect(
                userRepository.markVerifiedBySocialInTx
            ).toHaveBeenCalledWith(tx, 'user-flint', now);
        });
    });

    describe('sendEmailInTx', () => {
        const emailVerification: IUserVerificationEmailCreate = {
            reference: 'VRF-token',
            expiredAt: new Date('2026-03-01T00:05:00.000Z'),
            type: EnumVerificationType.email,
            token: 'random-token',
            hashedToken:
                'a67fa39caab4a23f78752354d1927f69d4e367be6229afb97c3aaddf7d138739',
            expiredInMinutes: 5,
            link: 'https://example.com/verify?token=random-token',
            resendInMinutes: 7,
        };
        const context: INotificationVerificationLinkContext = {
            userId: 'user-flint',
            proceedBy: 'user-flint',
            link: 'https://example.com/verify?token=random-token',
            expiredAt: '2026-03-01T00:05:00.000Z',
            expiredInMinutes: 5,
            reference: 'VRF-token',
        };

        it('replaces the active verification and adds the verificationEmail effect on the given tx without opening one', async () => {
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('random-token')
                .mockReturnValueOnce('token');

            await service.sendEmailInTx(tx, 'user-flint', 'flint@example.com');

            expect(
                userVerificationRepository.createReplacingActiveInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-flint',
                'flint@example.com',
                emailVerification,
                now
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.verificationEmail,
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                notifyEffect
            );
        });
    });

    describe('getOneActiveReauthentication', () => {
        const reauthentication: Verification = {
            ...verification,
            type: EnumVerificationType.reauthentication,
            action: EnumUserReauthenticationAction.mobileNumberAdd,
        };

        it('returns the unused unexpired row of the user, action, and hashed code', async () => {
            userVerificationRepository.findOneActiveReauthentication.mockResolvedValue(
                reauthentication
            );

            await expect(
                service.getOneActiveReauthentication(
                    'user-flint',
                    EnumUserReauthenticationAction.mobileNumberAdd,
                    '123456'
                )
            ).resolves.toBe(reauthentication);

            expect(
                userVerificationRepository.findOneActiveReauthentication
            ).toHaveBeenCalledWith(
                'user-flint',
                EnumUserReauthenticationAction.mobileNumberAdd,
                '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
            );
        });

        it('throws UserReauthenticationOtpInvalidException when no row matches', async () => {
            userVerificationRepository.findOneActiveReauthentication.mockResolvedValue(
                null
            );

            await expect(
                service.getOneActiveReauthentication(
                    'user-flint',
                    EnumUserReauthenticationAction.mobileNumberAdd,
                    '000000'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.reauthenticationOtpInvalid,
            });
        });
    });

    describe('assertReauthenticationResendable', () => {
        it('resolves when the action has no earlier code', async () => {
            userVerificationRepository.findOneLatestReauthentication.mockResolvedValue(
                null
            );

            await expect(
                service.assertReauthenticationResendable(
                    'user-flint',
                    EnumUserReauthenticationAction.deleteSelf
                )
            ).resolves.toBeUndefined();

            expect(
                userVerificationRepository.findOneLatestReauthentication
            ).toHaveBeenCalledWith(
                'user-flint',
                EnumUserReauthenticationAction.deleteSelf
            );
        });

        it('resolves when the latest code of the action is outside the resend window', async () => {
            userVerificationRepository.findOneLatestReauthentication.mockResolvedValue(
                verification
            );

            await expect(
                service.assertReauthenticationResendable(
                    'user-flint',
                    EnumUserReauthenticationAction.deleteSelf
                )
            ).resolves.toBeUndefined();
        });

        it('throws UserReauthenticationOtpResendLimitException inside the resend window, used or not', async () => {
            userVerificationRepository.findOneLatestReauthentication.mockResolvedValue(
                { ...verification, isUsed: true, createdAt: now }
            );

            await expect(
                service.assertReauthenticationResendable(
                    'user-flint',
                    EnumUserReauthenticationAction.deleteSelf
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.reauthenticationOtpResendLimit,
            });
        });
    });

    describe('sendReauthenticationInTx', () => {
        const expiredAt = new Date('2026-03-01T00:05:00.000Z');
        const context: INotificationReauthenticationOtpContext = {
            userId: 'user-flint',
            proceedBy: 'user-flint',
            verificationId: 'verification-reauth',
            otp: '123456',
            action: EnumUserReauthenticationAction.mobileNumberAdd,
            expiredInMinutes: 5,
        };

        beforeEach(() => {
            vi.spyOn(helperNumberService, 'randomDigits').mockReturnValue(
                '123456'
            );
            vi.spyOn(helperStringService, 'random').mockReturnValue('reauth');
        });

        it('marks the unused codes of the action used, creates the row holding only the code hash, and adds the reauthenticationOtp effect on the given tx', async () => {
            userVerificationRepository.createInTx.mockResolvedValue({
                ...verification,
                id: 'verification-reauth',
            });

            await service.sendReauthenticationInTx(
                tx,
                'user-flint',
                'flint@example.com',
                EnumUserReauthenticationAction.mobileNumberAdd
            );

            expect(
                userVerificationRepository.markUnusedReauthenticationUsedInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-flint',
                EnumUserReauthenticationAction.mobileNumberAdd
            );
            expect(
                userVerificationRepository.markUnusedReauthenticationUsedInTx
            ).toHaveBeenCalledBefore(userVerificationRepository.createInTx);
            expect(userVerificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-flint',
                {
                    reference: 'VRF-reauth',
                    token: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
                    type: EnumVerificationType.reauthentication,
                    action: EnumUserReauthenticationAction.mobileNumberAdd,
                    mobileNumberId: null,
                    to: 'flint@example.com',
                    expiredAt,
                    verifiedAt: null,
                    isUsed: false,
                },
                'user-flint'
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.reauthenticationOtp,
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                notifyEffect
            );
        });

        it('adds no effect when the row write throws', async () => {
            userVerificationRepository.createInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.sendReauthenticationInTx(
                    tx,
                    'user-flint',
                    'flint@example.com',
                    EnumUserReauthenticationAction.mobileNumberAdd
                )
            ).rejects.toThrow('boom');
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('sendMobileInTx', () => {
        const expiredAt = new Date('2026-03-01T00:05:00.000Z');
        const context: INotificationVerificationMobileNumberContext = {
            userId: 'user-flint',
            proceedBy: 'user-flint',
            verificationId: 'verification-mobile',
            otp: '123456',
            reference: 'VRF-mobile',
            expiredInMinutes: 5,
        };

        beforeEach(() => {
            vi.spyOn(helperNumberService, 'randomDigits').mockReturnValue(
                '123456'
            );
            vi.spyOn(helperStringService, 'random').mockReturnValue('mobile');
        });

        it('stores the SHA-256 hash of the OTP with the mobile number type and the number id, and never the OTP itself', async () => {
            userVerificationRepository.createInTx.mockResolvedValue({
                ...verification,
                id: 'verification-mobile',
            });

            await service.sendMobileInTx(
                tx,
                'user-flint',
                'mobile-flint',
                '+6281234567890'
            );

            expect(userVerificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-flint',
                {
                    reference: 'VRF-mobile',
                    token: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
                    type: EnumVerificationType.mobileNumber,
                    action: null,
                    mobileNumberId: 'mobile-flint',
                    to: '+6281234567890',
                    expiredAt,
                    verifiedAt: null,
                    isUsed: false,
                },
                'user-flint'
            );
        });

        it('marks the number earlier unused rows used before it creates the new row, then adds the verificationMobileNumber effect on the given tx', async () => {
            userVerificationRepository.createInTx.mockResolvedValue({
                ...verification,
                id: 'verification-mobile',
            });

            await service.sendMobileInTx(
                tx,
                'user-flint',
                'mobile-flint',
                '+6281234567890'
            );

            expect(
                userVerificationRepository.markUnusedMobileUsedInTx
            ).toHaveBeenCalledWith(tx, 'mobile-flint');
            expect(
                userVerificationRepository.markUnusedMobileUsedInTx
            ).toHaveBeenCalledBefore(userVerificationRepository.createInTx);
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.verificationMobileNumber,
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                notifyEffect
            );
        });

        it('adds no effect when the row write throws', async () => {
            userVerificationRepository.createInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.sendMobileInTx(
                    tx,
                    'user-flint',
                    'mobile-flint',
                    '+6281234567890'
                )
            ).rejects.toThrow('boom');
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('isMobileResendable', () => {
        it('returns true when the number has no code row', async () => {
            userVerificationRepository.findOneLatestByMobileNumber.mockResolvedValue(
                null
            );

            await expect(
                service.isMobileResendable('user-flint', 'mobile-flint')
            ).resolves.toBe(true);

            expect(
                userVerificationRepository.findOneLatestByMobileNumber
            ).toHaveBeenCalledWith('user-flint', 'mobile-flint');
        });

        it('returns false while the latest row, used or not, is inside the resend window', async () => {
            userVerificationRepository.findOneLatestByMobileNumber.mockResolvedValue(
                { ...verification, isUsed: true, createdAt: now }
            );

            await expect(
                service.isMobileResendable('user-flint', 'mobile-flint')
            ).resolves.toBe(false);
        });

        it('returns true outside the resend window', async () => {
            userVerificationRepository.findOneLatestByMobileNumber.mockResolvedValue(
                verification
            );

            await expect(
                service.isMobileResendable('user-flint', 'mobile-flint')
            ).resolves.toBe(true);
        });
    });

    describe('getOneActiveByMobileOtp', () => {
        it('returns the row scoped by user, number, and the hash of the code', async () => {
            userVerificationRepository.findOneActiveByMobileOtp.mockResolvedValue(
                verification
            );

            await expect(
                service.getOneActiveByMobileOtp(
                    'user-flint',
                    'mobile-flint',
                    '123456'
                )
            ).resolves.toBe(verification);

            expect(
                userVerificationRepository.findOneActiveByMobileOtp
            ).toHaveBeenCalledWith(
                'user-flint',
                'mobile-flint',
                '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
            );
        });

        it('throws UserTokenInvalidException when no active row matches', async () => {
            userVerificationRepository.findOneActiveByMobileOtp.mockResolvedValue(
                null
            );

            await expect(
                service.getOneActiveByMobileOtp(
                    'user-flint',
                    'mobile-flint',
                    '123456'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
        });
    });

    describe('expireActiveByMobileNumberInTx', () => {
        it('marks the number unused rows used on the given tx', async () => {
            await service.expireActiveByMobileNumberInTx(tx, 'mobile-flint');

            expect(
                userVerificationRepository.markUnusedMobileUsedInTx
            ).toHaveBeenCalledWith(tx, 'mobile-flint');
        });
    });

    describe('getOneActiveMobileRecipient', () => {
        it('returns the number the active row was sent to', async () => {
            userVerificationRepository.findOneActiveMobileById.mockResolvedValue(
                { ...verification, to: '+6281234567890' }
            );

            await expect(
                service.getOneActiveMobileRecipient('verification-flint')
            ).resolves.toBe('+6281234567890');

            expect(
                userVerificationRepository.findOneActiveMobileById
            ).toHaveBeenCalledWith('verification-flint');
        });

        it('returns null for a used or expired row', async () => {
            userVerificationRepository.findOneActiveMobileById.mockResolvedValue(
                null
            );

            await expect(
                service.getOneActiveMobileRecipient('verification-flint')
            ).resolves.toBeNull();
        });
    });

    describe('purgeExpired', () => {
        it('deletes the verifications expired before now minus the retention and returns the count', async () => {
            const threshold = new Date('2025-12-01T00:00:00.000Z');
            userVerificationRepository.deleteExpiredBefore.mockResolvedValue(8);

            await expect(service.purgeExpired()).resolves.toBe(8);

            expect(
                userVerificationRepository.deleteExpiredBefore
            ).toHaveBeenCalledWith(threshold);
        });
    });

    describe('markUsedInTx', () => {
        it('marks the verification used at now and returns whether the guard held', async () => {
            userVerificationRepository.markUsedInTx.mockResolvedValue(false);

            await expect(
                service.markUsedInTx(tx, 'verification-flint', 'user-flint')
            ).resolves.toBe(false);

            expect(
                userVerificationRepository.markUsedInTx
            ).toHaveBeenCalledWith(tx, 'verification-flint', now, 'user-flint');
        });
    });

    describe('markMobileUsedInTx', () => {
        it('marks the verification used at now', async () => {
            userVerificationRepository.markUsedInTx.mockResolvedValue(true);

            await service.markMobileUsedInTx(
                tx,
                'verification-flint',
                'user-flint'
            );

            expect(
                userVerificationRepository.markUsedInTx
            ).toHaveBeenCalledWith(tx, 'verification-flint', now, 'user-flint');
        });

        it('throws UserTokenInvalidException when the verification was used or expired first', async () => {
            userVerificationRepository.markUsedInTx.mockResolvedValue(false);

            await expect(
                service.markMobileUsedInTx(
                    tx,
                    'verification-flint',
                    'user-flint'
                )
            ).rejects.toMatchObject({
                module: 'user',

                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
        });
    });

    describe('createInTx', () => {
        it('delegates to the repository', async () => {
            const createVerification: IUserCreateVerification = {
                reference: 'VRF-create',
                token: 'hashed-token',
                type: EnumVerificationType.email,
                action: null,
                mobileNumberId: null,
                to: 'flint@example.com',
                expiredAt: new Date('2026-03-05T00:00:00.000Z'),
                verifiedAt: null,
                isUsed: false,
            };
            userVerificationRepository.createInTx.mockResolvedValue(
                verification
            );

            await expect(
                service.createInTx(
                    tx,
                    'user-flint',
                    createVerification,
                    'admin-flint'
                )
            ).resolves.toBe(verification);
            expect(userVerificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-flint',
                createVerification,
                'admin-flint'
            );
        });
    });
});
