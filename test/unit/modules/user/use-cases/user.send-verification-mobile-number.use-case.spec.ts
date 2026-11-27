import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { UserMobileNumberAlreadyVerifiedException } from '@modules/user/exceptions/user.mobile-number-already-verified.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import type { IUserMobileNumberSummary } from '@modules/user/interfaces/user.interface';
import { UserMobileNumberService } from '@modules/user/services/user.mobile-number.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserSendVerificationMobileNumberUseCase } from '@modules/user/use-cases/user.send-verification-mobile-number.use-case';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserSendVerificationMobileNumberUseCase', () => {
    const userMobileNumberService: MockProxy<UserMobileNumberService> =
        mock<UserMobileNumberService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: UserSendVerificationMobileNumberUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('user-swift');
    const tx = {} as IDatabaseTransactionClient;
    const entry = buildActivityLogCreateManyEffect('activityLog');
    const mobileNumber: IUserMobileNumberSummary = {
        id: 'mobile-swift',
        number: '81234567890',
        phoneCode: '62',
        isVerified: false,
    };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogQueue.recordEffect.mockReturnValue(entry);
        userMobileNumberService.getOneUnverifiedMobileNumber.mockResolvedValue(
            mobileNumber
        );
        userMobileNumberService.toDialableNumber.mockReturnValue(
            '+6281234567890'
        );
        userVerificationService.isMobileResendable.mockResolvedValue(true);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSendVerificationMobileNumberUseCase,
                {
                    provide: UserMobileNumberService,
                    useValue: userMobileNumberService,
                },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(UserSendVerificationMobileNumberUseCase);
    });

    describe('execute', () => {
        it('adds the verificationMobileNumber effect and the entry in one transaction', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'mobile-swift'
            );

            expect(
                userMobileNumberService.getOneUnverifiedMobileNumber
            ).toHaveBeenCalledWith('user-swift', 'mobile-swift');
            expect(
                userVerificationService.isMobileResendable
            ).toHaveBeenCalledWith('user-swift', 'mobile-swift');
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userVerificationService.sendMobileInTx).toHaveBeenCalledWith(
                tx,
                'user-swift',
                'mobile-swift',
                '+6281234567890'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userVerificationMobileNumberSent,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(result).toEqual({});
        });

        it('answers 200, adds no effect and no entry for a send inside the resend window', async () => {
            userVerificationService.isMobileResendable.mockResolvedValue(false);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'mobile-swift'
            );

            expect(result).toEqual({});
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendMobileInTx
            ).not.toHaveBeenCalled();
            expect(activityLogQueue.recordEffect).not.toHaveBeenCalled();
        });

        it('throws UserMobileNumberNotFoundException for a number that is not the caller and writes nothing', async () => {
            userMobileNumberService.getOneUnverifiedMobileNumber.mockRejectedValue(
                new UserMobileNumberNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-other'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberNotFound,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the resend window while the number read is still pending', async () => {
            const numberRead = buildDeferred<IUserMobileNumberSummary>();
            userMobileNumberService.getOneUnverifiedMobileNumber.mockReturnValue(
                numberRead.promise
            );

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'mobile-swift'
            );

            expect(
                userVerificationService.isMobileResendable
            ).toHaveBeenCalledWith('user-swift', 'mobile-swift');

            numberRead.resolve(mobileNumber);
            await running;
        });

        it('throws UserMobileNumberAlreadyVerifiedException for a verified number and writes nothing', async () => {
            userMobileNumberService.getOneUnverifiedMobileNumber.mockRejectedValue(
                new UserMobileNumberAlreadyVerifiedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'mobile-swift'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.mobileNumberAlreadyVerified,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
