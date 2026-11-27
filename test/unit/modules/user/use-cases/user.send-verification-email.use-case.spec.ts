import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import type { UserSendEmailVerificationRequestDto } from '@modules/user/dtos/request/user.send-email-verification.request.dto';
import { UserSendVerificationEmailUseCase } from '@modules/user/use-cases/user.send-verification-email.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';

describe('UserSendVerificationEmailUseCase', () => {
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const tx = {} as IDatabaseTransactionClient;
    const entry = buildActivityLogCreateManyEffect('activityLog');

    let useCase: UserSendVerificationEmailUseCase;

    const user: User = {
        id: 'user-wren',
        name: 'Wren',
        username: 'wren',
        isVerified: false,
        verifiedAt: null,
        email: 'wren@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIpAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogQueue.recordEffect.mockReturnValue(entry);
        userVerificationService.getOneForResendByEmail.mockResolvedValue(user);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSendVerificationEmailUseCase,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
            ],
        }).compile();
        useCase = module.get(UserSendVerificationEmailUseCase);
    });

    describe('execute', () => {
        const dto: UserSendEmailVerificationRequestDto = {
            email: 'wren@example.com',
        };

        it('answers AwsSesNotConfiguredException before any account read when SES is unset', async () => {
            userService.assertEmailDeliverable.mockImplementation(() => {
                throw new AwsSesNotConfiguredException();
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(
                userVerificationService.getOneForResendByEmail
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens one transaction holding sendEmailInTx then the userVerificationEmailSent entry and answers empty', async () => {
            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                dto
            );

            expect(result).toEqual({});
            expect(
                userVerificationService.getOneForResendByEmail
            ).toHaveBeenCalledWith('wren@example.com');
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userVerificationService.sendEmailInTx).toHaveBeenCalledWith(
                tx,
                'user-wren',
                'wren@example.com'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userVerificationEmailSent,
                    userId: 'user-wren',
                    createdBy: 'user-wren',
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entry);
            expect(
                userVerificationService.sendEmailInTx
            ).toHaveBeenCalledBefore(outboxService.addInTx);
        });

        it('answers empty and opens no transaction when the account is missing, inactive, or already verified', async () => {
            userVerificationService.getOneForResendByEmail.mockResolvedValue(
                null
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).resolves.toEqual({});

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                userVerificationService.sendEmailInTx
            ).not.toHaveBeenCalled();
        });

        it('rejects and adds no entry when the send rejects', async () => {
            userVerificationService.sendEmailInTx.mockRejectedValue(
                new Error('commit-failed')
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, dto)
            ).rejects.toThrow('commit-failed');
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
