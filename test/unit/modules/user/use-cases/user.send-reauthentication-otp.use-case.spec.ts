import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { UserReauthenticationOtpNotAllowedException } from '@modules/user/exceptions/user.reauthentication-otp-not-allowed.exception';
import { UserReauthenticationOtpResendLimitException } from '@modules/user/exceptions/user.reauthentication-otp-resend-limit.exception';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { UserService } from '@modules/user/services/user.service';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserSendReauthenticationOtpUseCase } from '@modules/user/use-cases/user.send-reauthentication-otp.use-case';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserSendReauthenticationOtpUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();

    let useCase: UserSendReauthenticationOtpUseCase;

    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-swift', 'user-swift@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);
    const tx = {} as IDatabaseTransactionClient;
    const entry = buildActivityLogCreateManyEffect('activityLog');
    const dto = { action: EnumUserReauthenticationAction.mobileNumberDelete };

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogQueue.recordEffect.mockReturnValue(entry);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSendReauthenticationOtpUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserAuthService, useValue: userAuthService },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
            ],
        }).compile();
        useCase = module.get(UserSendReauthenticationOtpUseCase);
    });

    describe('execute', () => {
        it('answers AwsSesNotConfiguredException before any check when SES is unset', async () => {
            userService.assertEmailDeliverable.mockImplementation(() => {
                throw new AwsSesNotConfiguredException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(
                userAuthService.assertReauthenticationOtpAllowed
            ).not.toHaveBeenCalled();
            expect(
                userVerificationService.assertReauthenticationResendable
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws not allowed for an account with a stronger proof and writes nothing', async () => {
            userAuthService.assertReauthenticationOtpAllowed.mockRejectedValue(
                new UserReauthenticationOtpNotAllowedException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.reauthenticationOtpNotAllowed,
            });

            expect(
                userAuthService.assertReauthenticationOtpAllowed
            ).toHaveBeenCalledWith(user);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendReauthenticationInTx
            ).not.toHaveBeenCalled();
        });

        it('checks the resend limit while the not-allowed gate is still pending', async () => {
            const gate = buildDeferred<void>();
            userAuthService.assertReauthenticationOtpAllowed.mockReturnValue(
                gate.promise
            );

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(
                userVerificationService.assertReauthenticationResendable
            ).toHaveBeenCalledWith('user-swift', dto.action);

            gate.resolve();
            await running;
        });

        it('throws the resend limit inside the window of the action and writes nothing', async () => {
            userVerificationService.assertReauthenticationResendable.mockRejectedValue(
                new UserReauthenticationOtpResendLimitException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode:
                    EnumUserStatusCodeError.reauthenticationOtpResendLimit,
            });

            expect(
                userVerificationService.assertReauthenticationResendable
            ).toHaveBeenCalledWith(
                'user-swift',
                EnumUserReauthenticationAction.mobileNumberDelete
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendReauthenticationInTx
            ).not.toHaveBeenCalled();
        });

        it('sends the code for the action and records the entry on one transaction', async () => {
            const callOrder: string[] = [];
            userVerificationService.sendReauthenticationInTx.mockImplementation(
                async () => {
                    callOrder.push('send');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({});

            expect(
                userVerificationService.assertReauthenticationResendable
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(
                userVerificationService.sendReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-swift',
                'user-swift@example.com',
                EnumUserReauthenticationAction.mobileNumberDelete
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userReauthenticationOtpSent }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(callOrder).toEqual(['send', 'addInTx']);
        });
    });
});
