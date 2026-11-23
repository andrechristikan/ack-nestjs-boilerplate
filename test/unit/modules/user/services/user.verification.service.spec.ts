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
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { Duration } from 'luxon';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { NotificationService } from '@modules/notification/services/notification.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type {
    INotificationReauthenticationOtpContext,
    INotificationVerificationLinkContext,
    INotificationVerificationMobileNumberContext,
} from '@modules/notification/interfaces/notification.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserReauthenticationOtpInvalidException } from '@modules/user/exceptions/user.reauthentication-otp-invalid.exception';
import { UserReauthenticationOtpResendLimitException } from '@modules/user/exceptions/user.reauthentication-otp-resend-limit.exception';
import type {
    IUser,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';

describe('UserVerificationService', () => {
    const userVerificationRepository: MockProxy<UserVerificationRepository> =
        mock<UserVerificationRepository>();
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const entry = buildActivityLogCreateManyEffect('activityLog');
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();
    const configGet = vi.fn<(key: string) => number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>({ resendInMinutes: 7 });

    let service: UserVerificationService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');

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
        passwordLockedUntil: null,
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
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-flint',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };

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

    beforeEach(async () => {
        vi.resetAllMocks();
        activityLogService.recordEffect.mockReturnValue(entry);
        notificationService.notify.mockReturnValue(notifyEffect);
        userRepository.findOneById.mockResolvedValue(baseUser);
        userRepository.markVerifiedInTx.mockResolvedValue(baseUser);
        userVerificationRepository.markUsedInTx.mockResolvedValue(true);

        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        configGet.mockImplementation(
            key =>
                ({
                    'verification.otpLength': 6,
                    'verification.expiresInMinutes': 5,
                    'verification.retentionInMs': 7776000000,
                })[key]
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationService,
                {
                    provide: UserVerificationRepository,
                    useValue: userVerificationRepository,
                },
                { provide: UserRepository, useValue: userRepository },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationService, useValue: notificationService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: HelperNumberService, useValue: helperNumberService },
                { provide: ConfigService, useValue: configService },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
            ],
        }).compile();
        service = module.get(UserVerificationService);
    });

    describe('getOneActiveByEmailToken', () => {
        it('returns the active verification of the hashed token with its user', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).resolves.toEqual({ verification, user: baseUser });

            expect(
                userVerificationRepository.findOneActiveByVerificationEmailToken
            ).toHaveBeenCalledWith('hashed-token');
            expect(userRepository.findOneById).toHaveBeenCalledWith(
                verification.userId
            );
        });

        it('returns the verification of an inactive user too', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            const inactiveUser = {
                ...baseUser,
                status: EnumUserStatus.inactive,
            };
            userRepository.findOneById.mockResolvedValue(inactiveUser);

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).resolves.toEqual({ verification, user: inactiveUser });
            expect(userRepository.findOneActiveById).not.toHaveBeenCalled();
        });

        it('throws UserTokenInvalidException when the token is unknown', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                null
            );

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.tokenInvalid
                    ],
                messagePath: 'user.error.verificationTokenInvalid',
            });
        });

        it('throws UserEmailAlreadyVerifiedException when the user is already verified', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            userRepository.findOneById.mockResolvedValue({
                ...baseUser,
                isVerified: true,
            });

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailAlreadyVerified,
                messagePath: 'user.error.emailAlreadyVerified',
            });
        });

        it('throws UserNotFoundException when the verified user is gone', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationRepository.findOneActiveByVerificationEmailToken.mockResolvedValue(
                verification
            );
            userRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.getOneActiveByEmailToken('raw-token')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });
        });
    });

    describe('verifyEmail', () => {
        it('marks the verification and the user verified and adds the verifiedEmail effect in one transaction', async () => {
            await service.verifyEmail(
                requestContext,
                apiKeyContext,
                verification
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.verifiedEmail,
                {
                    userId: 'user-flint',
                    proceedBy: 'user-flint',
                    reference: 'VRF-flint',
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerifiedEmail,
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

            const call = service.verifyEmail(
                requestContext,
                apiKeyContext,
                verification
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
                messagePath: 'user.error.verificationTokenInvalid',
            });
            expect(userRepository.markVerifiedInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = new Error('write-conflict');
            userVerificationRepository.markUsedInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            const call = service.verifyEmail(
                requestContext,
                apiKeyContext,
                verification
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            const error = new UserNotFoundException();
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.verifyEmail(
                requestContext,
                apiKeyContext,
                verification
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            const error = new Error('boom');
            outboxService.withTransaction.mockRejectedValueOnce(error);

            const call = service.verifyEmail(
                requestContext,
                apiKeyContext,
                verification
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
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
            expect(userUtil.isInsideResendWindow).not.toHaveBeenCalled();
        });

        it('returns false inside the resend window', async () => {
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                verification
            );
            userUtil.isInsideResendWindow.mockReturnValue(true);

            await expect(service.isEmailResendable(baseUser)).resolves.toBe(
                false
            );

            expect(userUtil.isInsideResendWindow).toHaveBeenCalledWith(
                verification.createdAt,
                7
            );
        });

        it('returns true outside the resend window', async () => {
            userVerificationRepository.findOneLatestByVerificationEmail.mockResolvedValue(
                verification
            );
            userUtil.isInsideResendWindow.mockReturnValue(false);

            await expect(service.isEmailResendable(baseUser)).resolves.toBe(
                true
            );

            expect(userUtil.isInsideResendWindow).toHaveBeenCalledWith(
                verification.createdAt,
                7
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
                verification
            );
            userUtil.isInsideResendWindow.mockReturnValue(true);

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

    describe('sendEmail', () => {
        const emailVerification: IUserVerificationEmailCreate = {
            reference: 'VRF-random-token',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            type: EnumVerificationType.email,
            token: 'random-token',
            hashedToken: 'hashed-token',
            expiredInMinutes: 15,
            link: 'https://example.com/verify?token=random-token',
            resendInMinutes: 5,
        };
        const context: INotificationVerificationLinkContext = {
            userId: 'user-flint',
            proceedBy: 'user-flint',
            link: 'https://example.com/verify?token=random-token',
            expiredAt: '2026-03-05T00:00:00.000Z',
            expiredInMinutes: 15,
            reference: 'VRF-random-token',
        };

        it('replaces the active verification and adds the verificationEmail effect on one transaction', async () => {
            userVerificationUtil.createEmail.mockReturnValue(emailVerification);
            userVerificationUtil.mapEmailContext.mockReturnValue(context);

            await service.sendEmail(
                requestContext,
                apiKeyContext,
                'user-flint',
                'flint@example.com'
            );

            expect(userVerificationUtil.createEmail).toHaveBeenCalledWith();
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userVerificationRepository.createReplacingActiveInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-flint',
                'flint@example.com',
                emailVerification,
                now
            );
            expect(userVerificationUtil.mapEmailContext).toHaveBeenCalledWith(
                'user-flint',
                emailVerification
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.verificationEmail,
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                notifyEffect
            );
            expect(
                userVerificationRepository.createReplacingActiveInTx
            ).toHaveBeenCalledBefore(outboxService.addInTx);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userSendVerificationEmail,
                    userId: 'user-flint',
                    createdBy: 'user-flint',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
        });

        it('adds no effect when the verification write throws', async () => {
            userVerificationUtil.createEmail.mockReturnValue(emailVerification);
            userVerificationRepository.createReplacingActiveInTx.mockRejectedValue(
                new Error('boom')
            );

            await expect(
                service.sendEmail(
                    requestContext,
                    apiKeyContext,
                    'user-flint',
                    'flint@example.com'
                )
            ).rejects.toThrow('boom');
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(activityLogService.recordEffect).not.toHaveBeenCalled();
        });
    });

    describe('sendEmailInTx', () => {
        const emailVerification: IUserVerificationEmailCreate = {
            reference: 'VRF-random-token',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            type: EnumVerificationType.email,
            token: 'random-token',
            hashedToken: 'hashed-token',
            expiredInMinutes: 15,
            link: 'https://example.com/verify?token=random-token',
            resendInMinutes: 5,
        };
        const context: INotificationVerificationLinkContext = {
            userId: 'user-flint',
            proceedBy: 'user-flint',
            link: 'https://example.com/verify?token=random-token',
            expiredAt: '2026-03-05T00:00:00.000Z',
            expiredInMinutes: 15,
            reference: 'VRF-random-token',
        };

        it('replaces the active verification and adds the verificationEmail effect on the given tx without opening one', async () => {
            userVerificationUtil.createEmail.mockReturnValue(emailVerification);
            userVerificationUtil.mapEmailContext.mockReturnValue(context);

            await service.sendEmailInTx(tx, 'user-flint', 'flint@example.com');

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationRepository.createReplacingActiveInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-flint',
                'flint@example.com',
                emailVerification,
                now
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
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
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
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

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith('123456');
            expect(
                userVerificationRepository.findOneActiveReauthentication
            ).toHaveBeenCalledWith(
                'user-flint',
                EnumUserReauthenticationAction.mobileNumberAdd,
                'hashed-otp'
            );
        });

        it('throws UserReauthenticationOtpInvalidException when no row matches', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
            userVerificationRepository.findOneActiveReauthentication.mockResolvedValue(
                null
            );

            await expect(
                service.getOneActiveReauthentication(
                    'user-flint',
                    EnumUserReauthenticationAction.mobileNumberAdd,
                    '000000'
                )
            ).rejects.toBeInstanceOf(UserReauthenticationOtpInvalidException);
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
            expect(userUtil.isInsideResendWindow).not.toHaveBeenCalled();
        });

        it('resolves when the latest code of the action is outside the resend window', async () => {
            userVerificationRepository.findOneLatestReauthentication.mockResolvedValue(
                verification
            );
            userUtil.isInsideResendWindow.mockReturnValue(false);

            await expect(
                service.assertReauthenticationResendable(
                    'user-flint',
                    EnumUserReauthenticationAction.deleteSelf
                )
            ).resolves.toBeUndefined();

            expect(userUtil.isInsideResendWindow).toHaveBeenCalledWith(
                verification.createdAt,
                7
            );
        });

        it('throws UserReauthenticationOtpResendLimitException inside the resend window, used or not', async () => {
            userVerificationRepository.findOneLatestReauthentication.mockResolvedValue(
                { ...verification, isUsed: true }
            );
            userUtil.isInsideResendWindow.mockReturnValue(true);

            await expect(
                service.assertReauthenticationResendable(
                    'user-flint',
                    EnumUserReauthenticationAction.deleteSelf
                )
            ).rejects.toBeInstanceOf(
                UserReauthenticationOtpResendLimitException
            );
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
            helperNumberService.randomDigits.mockReturnValue('123456');
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
            userVerificationUtil.createReference.mockReturnValue('VRF-reauth');
            userVerificationUtil.createExpiredAt.mockReturnValue(expiredAt);
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

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(helperNumberService.randomDigits).toHaveBeenCalledWith(6);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith('123456');
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
                    token: 'hashed-otp',
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
            expect(notificationService.notify).toHaveBeenCalledWith(
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
            helperNumberService.randomDigits.mockReturnValue('123456');
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
            userVerificationUtil.createReference.mockReturnValue('VRF-mobile');
            userVerificationUtil.createExpiredAt.mockReturnValue(expiredAt);
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

            expect(helperNumberService.randomDigits).toHaveBeenCalledWith(6);
            expect(helperHashService.sha256Hash).toHaveBeenCalledWith('123456');
            expect(userVerificationRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'user-flint',
                {
                    reference: 'VRF-mobile',
                    token: 'hashed-otp',
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

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationRepository.markUnusedMobileUsedInTx
            ).toHaveBeenCalledWith(tx, 'mobile-flint');
            expect(
                userVerificationRepository.markUnusedMobileUsedInTx
            ).toHaveBeenCalledBefore(userVerificationRepository.createInTx);
            expect(notificationService.notify).toHaveBeenCalledWith(
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
            expect(userUtil.isInsideResendWindow).not.toHaveBeenCalled();
        });

        it('returns false while the latest row, used or not, is inside the resend window', async () => {
            userVerificationRepository.findOneLatestByMobileNumber.mockResolvedValue(
                { ...verification, isUsed: true }
            );
            userUtil.isInsideResendWindow.mockReturnValue(true);

            await expect(
                service.isMobileResendable('user-flint', 'mobile-flint')
            ).resolves.toBe(false);

            expect(userUtil.isInsideResendWindow).toHaveBeenCalledWith(
                verification.createdAt,
                7
            );
        });

        it('returns true outside the resend window', async () => {
            userVerificationRepository.findOneLatestByMobileNumber.mockResolvedValue(
                verification
            );
            userUtil.isInsideResendWindow.mockReturnValue(false);

            await expect(
                service.isMobileResendable('user-flint', 'mobile-flint')
            ).resolves.toBe(true);
        });
    });

    describe('getOneActiveByMobileOtp', () => {
        it('returns the row scoped by user, number, and the hash of the code', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
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

            expect(helperHashService.sha256Hash).toHaveBeenCalledWith('123456');
            expect(
                userVerificationRepository.findOneActiveByMobileOtp
            ).toHaveBeenCalledWith('user-flint', 'mobile-flint', 'hashed-otp');
        });

        it('throws UserTokenInvalidException when no active row matches', async () => {
            helperHashService.sha256Hash.mockReturnValue('hashed-otp');
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
                messagePath: 'user.error.verificationTokenInvalid',
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
            const retention = Duration.fromObject({
                milliseconds: 7776000000,
            });
            const threshold = new Date('2025-12-01T00:00:00.000Z');
            helperDateService.createDuration.mockReturnValue(retention);
            helperDateService.backward.mockReturnValue(threshold);
            userVerificationRepository.deleteExpiredBefore.mockResolvedValue(8);

            await expect(service.purgeExpired()).resolves.toBe(8);

            expect(helperDateService.createDuration).toHaveBeenCalledWith({
                milliseconds: 7776000000,
            });
            expect(helperDateService.backward).toHaveBeenCalledWith(
                now,
                retention
            );
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
