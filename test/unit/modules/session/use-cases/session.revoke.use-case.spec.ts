import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    Prisma,
    EnumUserReauthenticationAction,
} from '@generated/prisma-client/client';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaInvalidException } from '@modules/mfa/exceptions/mfa.invalid.exception';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionService } from '@modules/session/services/session.service';
import { SessionRevokeUseCase } from '@modules/session/use-cases/session.revoke.use-case';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import type { IUserReauthenticationCheck } from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

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

describe('SessionRevokeUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const user = buildUser('user-1', 'actor@example.com');
    const userContext = buildUserContext(user);
    const authContext = buildAuthJwtAccessContext(user.id);
    const tx = {} as IDatabaseTransactionClient;
    const revokedAt = new Date('2026-03-05T00:00:00.000Z');
    const check: IUserReauthenticationCheck = {
        isPasswordChecked: true,
        mfa: null,
        verificationId: null,
        passkeyChallengeToken: null,
    };
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const dto = { password: 'Current-pass1' };

    let useCase: SessionRevokeUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(revokedAt);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        userAuthService.assertReauthentication.mockResolvedValue(check);
        activityLogService.recordEffect.mockReturnValue(entryEffect);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: UserAuthService, useValue: userAuthService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                DatabaseUtil,
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(SessionRevokeUseCase);
    });

    describe('execute', () => {
        it('asserts the re-authentication, then completes it, revokes the session, and adds the entry on one transaction', async () => {
            const calls: string[] = [];
            userAuthService.assertReauthentication.mockImplementation(
                async () => {
                    calls.push('assert');

                    return check;
                }
            );
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userAuthService.completeReauthenticationInTx.mockImplementation(
                async () => {
                    calls.push('complete');
                }
            );
            sessionService.revokeInTx.mockImplementation(async () => {
                calls.push('revoke');
            });
            outboxService.addInTx.mockImplementation(async () => {
                calls.push('addInTx');

                return 'outbox-id';
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'session-1',
                    dto
                )
            ).resolves.toEqual({});

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.sessionRevoke,
                    password: 'Current-pass1',
                    method: null,
                    code: null,
                    backupCode: null,
                    passkeyChallengeToken: null,
                    passkeyResponse: null,
                    otp: null,
                }
            );
            expect(
                userAuthService.completeReauthenticationInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                check
            );
            expect(sessionService.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'session-1',
                'user-1',
                revokedAt
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userRevokeSession }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(calls).toEqual([
                'assert',
                'begin',
                'complete',
                'revoke',
                'addInTx',
                'commit',
            ]);
        });

        it('passes the MFA and email-code fields of the request on', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'session-1',
                {
                    method: EnumMfaMethod.backupCode,
                    backupCode: 'BACKUP1',
                    code: '654321',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );

            expect(userAuthService.assertReauthentication).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                user,
                {
                    action: EnumUserReauthenticationAction.sessionRevoke,
                    password: null,
                    method: EnumMfaMethod.backupCode,
                    code: '654321',
                    backupCode: 'BACKUP1',
                    passkeyChallengeToken: 'challenge-quartz',
                    passkeyResponse,
                    otp: '123456',
                }
            );
        });

        it('leaves the session alone when the re-authentication fails', async () => {
            const failure = new UserPasswordNotMatchException();
            userAuthService.assertReauthentication.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'session-1',
                    dto
                )
            ).rejects.toBe(failure);

            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(sessionService.revokeInTx).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException of the transaction as it is, adding no entry', async () => {
            const failure = new SessionNotFoundException();
            sessionService.revokeInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'session-1',
                    dto
                )
            ).rejects.toBe(failure);

            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows a completion refusal as it is', async () => {
            const failure = new MfaInvalidException();
            userAuthService.completeReauthenticationInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'session-1',
                    dto
                )
            ).rejects.toBe(failure);

            expect(sessionService.revokeInTx).not.toHaveBeenCalled();
        });

        it('answers SessionNotFoundException on a write conflict', async () => {
            const conflict = new Prisma.PrismaClientKnownRequestError(
                'conflict',
                {
                    code: DatabaseWriteConflictCode,
                    clientVersion: 'test',
                }
            );
            outboxService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'session-1',
                    dto
                )
            ).rejects.toBeInstanceOf(SessionNotFoundException);
        });

        it('wraps an unknown error of the transaction in AppUnknownException', async () => {
            const cause = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'session-1',
                    dto
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
