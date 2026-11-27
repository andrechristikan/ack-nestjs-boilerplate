import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserMobileNumberAlreadyVerifiedException } from '@modules/user/exceptions/user.mobile-number-already-verified.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
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
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('UserVerifyMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

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
    const consumed: Verification = {
        ...verification,
        reference: 'VRF-consumed',
        to: '+6281200000000',
        isUsed: true,
    };
    const dto = { otp: '482913' };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogQueue.recordEffect.mockReturnValue(entry);
        notificationQueue.notify.mockReturnValue(notifyEffect);
        userMobileNumberService.getOneUnverifiedMobileNumber.mockResolvedValue(
            mobileNumber
        );
        userVerificationService.getOneActiveByMobileOtp.mockResolvedValue(
            verification
        );
        userVerificationService.markMobileUsedInTx.mockResolvedValue(consumed);

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
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(UserVerifyMobileNumberUseCase);
    });

    describe('execute', () => {
        it('marks the row used and the number verified on one tx, then reads the reference and number from the consumed row for the verifiedMobileNumber effect and the entry', async () => {
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
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userVerificationService.markMobileUsedInTx
            ).toHaveBeenCalledWith(tx, 'verification-swift', 'user-swift');
            expect(
                userMobileNumberService.markVerifiedInTx
            ).toHaveBeenCalledWith(tx, 'user-swift', 'mobile-swift');
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.verifiedMobileNumber,
                {
                    userId: 'user-swift',
                    proceedBy: 'user-swift',
                    reference: 'VRF-consumed',
                    mobileNumber: '+6281200000000',
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                { action: EnumActivityLogAction.userMobileNumberVerified }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entry,
                notifyEffect,
            ]);
            expect(result).toEqual({});
        });

        it('throws UserMobileNumberNotFoundException and writes nothing', async () => {
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
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the code while the unverified number read is still pending', async () => {
            const numberRead = buildDeferred<IUserMobileNumberSummary>();
            userMobileNumberService.getOneUnverifiedMobileNumber.mockReturnValue(
                numberRead.promise
            );

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'mobile-swift',
                dto
            );

            expect(
                userVerificationService.getOneActiveByMobileOtp
            ).toHaveBeenCalledWith('user-swift', 'mobile-swift', '482913');

            numberRead.resolve(mobileNumber);
            await running;
        });

        it('throws UserMobileNumberAlreadyVerifiedException and writes nothing', async () => {
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
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberAlreadyVerified,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.tokenInvalid,
            });
            expect(
                userMobileNumberService.markVerifiedInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });
});
