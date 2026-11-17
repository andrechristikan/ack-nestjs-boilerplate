import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { NotificationService } from '@modules/notification/services/notification.service';
import { UserMobileNumberAlreadyVerifiedException } from '@modules/user/exceptions/user.mobile-number-already-verified.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type { IUserMobileNumberSummary } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserVerifyMobileNumberUseCase } from '@modules/user/use-cases/user.verify-mobile-number.use-case';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserVerifyMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let useCase: UserVerifyMobileNumberUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('user-swift');
    const tx = {} as IDatabaseTransactionClient;
    const entry = buildActivityLogCreateManyEffect('activityLog');
    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.verifiedMobileNumber,
            context: {
                userId: 'user-swift',
                proceedBy: 'user-swift',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'verifiedMobileNumber-VRF-swift',
    };
    const mobileNumber: IUserMobileNumberSummary = {
        id: 'mobile-swift',
        number: '81234567890',
        phoneCode: '62',
        isVerified: false,
    };
    const verification: Verification = {
        id: 'verification-swift',
        userId: 'user-swift',
        mobileNumberId: 'mobile-swift',
        to: '+6281234567890',
        type: EnumVerificationType.mobileNumber,
        action: null,
        token: 'hashed-otp',
        expiredAt: new Date('2026-03-01T00:05:00.000Z'),
        verifiedAt: null,
        isUsed: false,
        reference: 'VRF-swift',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        createdBy: 'user-swift',
        updatedAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const dto = { otp: '482913' };

    beforeEach(async () => {
        vi.resetAllMocks();
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogService.recordEffect.mockReturnValue(entry);
        notificationService.notify.mockReturnValue(notifyEffect);
        userMobileNumberService.getOneUnverifiedMobileNumber.mockResolvedValue(
            mobileNumber
        );
        userVerificationService.getOneActiveByMobileOtp.mockResolvedValue(
            verification
        );
        userVerificationService.markMobileUsedInTx.mockResolvedValue();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerifyMobileNumberUseCase,
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: NotificationService, useValue: notificationService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();
        useCase = module.get(UserVerifyMobileNumberUseCase);
    });

    describe('execute', () => {
        it('marks the row used and the number verified on one tx, then adds the verifiedMobileNumber effect and the entry', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'mobile-swift',
                dto
            );

            expect(
                userVerificationService.getOneActiveByMobileOtp
            ).toHaveBeenCalledWith('user-swift', 'mobile-swift', '482913');
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userVerificationService.markMobileUsedInTx
            ).toHaveBeenCalledWith(tx, 'verification-swift', 'user-swift');
            expect(
                userMobileNumberService.markVerifiedInTx
            ).toHaveBeenCalledWith(tx, 'user-swift', 'mobile-swift');
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.verifiedMobileNumber,
                {
                    userId: 'user-swift',
                    proceedBy: 'user-swift',
                    reference: 'VRF-swift',
                    mobileNumber: '+6281234567890',
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userVerifiedMobileNumber }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entry,
                notifyEffect,
            ]);
            expect(result).toEqual({});
        });

        it('throws UserMobileNumberNotFoundException first and reads no code', async () => {
            userMobileNumberService.getOneUnverifiedMobileNumber.mockRejectedValue(
                new UserMobileNumberNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-other',
                    dto
                )
            ).rejects.toBeInstanceOf(UserMobileNumberNotFoundException);
            expect(
                userVerificationService.getOneActiveByMobileOtp
            ).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberAlreadyVerifiedException before it reads the code', async () => {
            userMobileNumberService.getOneUnverifiedMobileNumber.mockRejectedValue(
                new UserMobileNumberAlreadyVerifiedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-swift',
                    dto
                )
            ).rejects.toBeInstanceOf(UserMobileNumberAlreadyVerifiedException);
            expect(
                userVerificationService.getOneActiveByMobileOtp
            ).not.toHaveBeenCalled();
        });

        it('throws UserTokenInvalidException for a code sent before a number change and writes nothing', async () => {
            userVerificationService.getOneActiveByMobileOtp.mockRejectedValue(
                new UserTokenInvalidException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-swift',
                    dto
                )
            ).rejects.toBeInstanceOf(UserTokenInvalidException);
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });

        it('passes on the UserTokenInvalidException of a lost row guard and adds nothing', async () => {
            userVerificationService.markMobileUsedInTx.mockRejectedValue(
                new UserTokenInvalidException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-swift',
                    dto
                )
            ).rejects.toBeInstanceOf(UserTokenInvalidException);
            expect(
                userMobileNumberService.markVerifiedInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to UserTokenInvalidException', async () => {
            const conflict = new Error('write-conflict');
            userVerificationService.markMobileUsedInTx.mockRejectedValue(
                conflict
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-swift',
                    dto
                )
            ).rejects.toBeInstanceOf(UserTokenInvalidException);
        });

        it('wraps an unknown error in AppUnknownException', async () => {
            const failure = new Error('boom');
            userVerificationService.markMobileUsedInTx.mockRejectedValue(
                failure
            );
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-swift',
                    dto
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });
});
