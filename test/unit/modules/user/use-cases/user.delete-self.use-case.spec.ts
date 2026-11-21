import { TestUnitReauthenticationPasswordFailure } from '@test/unit/helpers/test.unit.user.helper';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { UserService } from '@modules/user/services/user.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserQueue } from '@modules/user/queues/user.queue';
import { EnumUserProcess, EnumUserQueue } from '@modules/user/enums/user.enum';
import type { IUserDeleteSelfEffect } from '@modules/user/interfaces/user.interface';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceOwnerTransferRequiredException } from '@modules/workspace/exceptions/workspace.owner-transfer-required.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserDeleteSelfForbiddenException } from '@modules/user/exceptions/user.delete-self-forbidden.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { UserDeleteSelfRequestDto } from '@modules/user/dtos/request/user.delete-self.request.dto';
import type {
    IUser,
    IUserReauthenticationCheck,
} from '@modules/user/interfaces/user.interface';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { UserDeleteSelfUseCase } from '@modules/user/use-cases/user.delete-self.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

const passkeyResponse = {
    id: 'AbC_-123',
    rawId: 'AbC_-123',
    response: {
        clientDataJSON: 'clientDataQuartz',
        authenticatorData: 'authenticatorDataQuartz',
        signature: 'signatureQuartz',
    },
    clientExtensionResults: {},
    type: 'public-key',
} as const;

describe('UserDeleteSelfUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();

    let useCase: UserDeleteSelfUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const baseUser: IUser = buildUser('user-cinder', 'cinder@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(baseUser.id);
    const userContext = buildUserContext(baseUser);

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDeleteSelfUseCase,
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserQueue, useValue: userQueue },
                { provide: WorkspaceService, useValue: workspaceService },
                DatabaseUtil,
                { provide: ConfigService, useValue: buildConfigService({}) },
            ],
        }).compile();
        useCase = module.get(UserDeleteSelfUseCase);
    });

    describe('execute', () => {
        const dto: UserDeleteSelfRequestDto = { password: 'plain-password' };

        const activityLog: IActivityLogActorPayload = {
            apiKeyId: 'api-key-one',
            actorUserId: 'user-cinder',
            workspaceId: null,
            requestLog: requestContext.requestLog,
        };

        const deleteSelfEffect: IUserDeleteSelfEffect = {
            queue: EnumUserQueue.user,
            name: EnumUserProcess.deleteSelf,
            data: {
                userId: 'user-cinder',
                ownedWorkspaceIds: ['workspace-one'],
                activityLog,
            },
            priority: EnumQueuePriority.high,
            idempotencyKey: null,
        };

        const check: IUserReauthenticationCheck = {
            isPasswordChecked: true,
            mfa: null,
            verificationId: null,
            passkeyChallengeToken: null,
        };

        beforeEach(() => {
            activityLogQueue.toPayload.mockReturnValue(activityLog);
            userQueue.deleteSelfEffect.mockReturnValue(deleteSelfEffect);
            userAuthService.checkReauthentication.mockResolvedValue({
                check,
                failure: null,
            });
            workspaceService.getOwnedForSelfDelete.mockResolvedValue([
                'workspace-one',
            ]);
        });

        it('completes the re-authentication then adds exactly one deleteSelf effect on its transaction and writes nothing else', async () => {
            const calls: string[] = [];
            userAuthService.completeReauthenticationInTx.mockImplementation(
                async () => {
                    calls.push('complete');
                }
            );
            outboxService.addInTx.mockImplementation(async () => {
                calls.push('addEffect');

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

            expect(calls).toEqual(['complete', 'addEffect']);
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                check
            );
            expect(activityLogQueue.toPayload).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null
            );
            expect(userQueue.deleteSelfEffect).toHaveBeenCalledWith(
                'user-cinder',
                ['workspace-one'],
                activityLog
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deleteSelfEffect
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(userService.deleteSelfInTx).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('opens the transaction with no options', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function)
            );
        });

        it('reads the actor id from the auth context', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'actor-other' },
                userContext,
                dto
            );

            expect(workspaceService.getOwnedForSelfDelete).toHaveBeenCalledWith(
                'actor-other'
            );
            expect(userQueue.deleteSelfEffect).toHaveBeenCalledWith(
                'actor-other',
                ['workspace-one'],
                activityLog
            );
        });

        it('commits the failed count in a transaction of its own, then throws, and adds no effect', async () => {
            const refusal = new Error('refused');
            userAuthService.checkReauthentication.mockResolvedValue({
                check: null,
                failure: TestUnitReauthenticationPasswordFailure,
            });
            userAuthService.countFailedReauthenticationInTx.mockResolvedValue(
                true
            );
            userAuthService.throwFailedReauthentication.mockImplementation(
                () => {
                    throw refusal;
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(refusal);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.countFailedReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                TestUnitReauthenticationPasswordFailure
            );
            expect(
                userAuthService.countFailedReauthenticationInTx
            ).toHaveBeenCalledBefore(
                userAuthService.throwFailedReauthentication
            );
            expect(
                userAuthService.throwFailedReauthentication
            ).toHaveBeenCalledWith(
                TestUnitReauthenticationPasswordFailure,
                true
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws UserDeleteSelfForbiddenException for a superAdmin before the password check', async () => {
            const superAdmin: IUser = {
                ...baseUser,
                role: { ...baseUser.role, type: EnumRoleType.superAdmin },
            };
            const failure = new UserDeleteSelfForbiddenException();
            userService.assertSelfDeletable.mockImplementation(() => {
                throw failure;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    buildAuthJwtAccessContext(superAdmin.id),
                    buildUserContext(superAdmin),
                    dto
                )
            ).rejects.toBe(failure);

            expect(userService.assertSelfDeletable).toHaveBeenCalledWith(
                superAdmin
            );
            expect(
                userAuthService.checkReauthentication
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws WorkspaceOwnerTransferRequiredException and opens no transaction when an owned workspace has another member', async () => {
            const failure = new WorkspaceOwnerTransferRequiredException();
            workspaceService.getOwnedForSelfDelete.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('passes the MFA and email-code fields of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                {
                    ...dto,
                    method: EnumMfaMethod.backupCode,
                    backupCode: 'BACKUP1',
                    code: '654321',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );

            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                baseUser,
                {
                    action: EnumUserReauthenticationAction.deleteSelf,
                    password: 'plain-password',
                    method: EnumMfaMethod.backupCode,
                    code: '654321',
                    backupCode: 'BACKUP1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );
        });

        it('passes a null password for an absent one', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {}
                )
            ).resolves.toEqual({});

            expect(userAuthService.checkReauthentication).toHaveBeenCalledWith(
                baseUser,
                expect.objectContaining({ password: null })
            );
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
        });

        it('throws UserPasswordNotMatchException and queues nothing when the password is absent', async () => {
            userAuthService.checkReauthentication.mockRejectedValue(
                new UserPasswordNotMatchException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    {}
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordNotMatch,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rejects an expired password after a match', async () => {
            const failure = new UserPasswordExpiredException();
            userAuthService.checkReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('completes nothing outside the transaction when the main step fails after a correct proof', async () => {
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2034')
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
                statusCode: EnumUserStatusCodeError.notFound,
            });

            expect(
                userAuthService.completeReauthenticationInTx
            ).not.toHaveBeenCalled();
        });

        it('answers UserNotFoundException on a write conflict', async () => {
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2034')
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
                statusCode: EnumUserStatusCodeError.notFound,
            });
        });

        it('rethrows a typed exception the transaction throws unchanged', async () => {
            const failure = new UserDeleteSelfForbiddenException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toBe(failure);
        });

        it('wraps an unknown error in AppUnknownException', async () => {
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
