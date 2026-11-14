import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { DeviceOwnership } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { DeviceService } from '@modules/device/services/device.service';
import type { IDeviceLoginUpsert } from '@modules/device/interfaces/device.interface';
import { SessionService } from '@modules/session/services/session.service';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { UserLogoutUseCase } from '@modules/user/use-cases/user.logout.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserLogoutUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLogoutUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = {
        ...buildAuthJwtAccessContext('user-bramble'),
        sessionId: 'session-bramble',
        deviceOwnershipId: 'device-ownership-bramble',
    };
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const ownership: DeviceOwnership = {
        id: 'device-ownership-bramble',
        deviceId: 'device-bramble',
        userId: 'user-bramble',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        notificationToken: 'token-bramble',
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const upsert: IDeviceLoginUpsert = {
        device: {
            id: 'device-bramble',
            fingerprint: 'device-bramble',
            name: null,
            platform: EnumDevicePlatform.android,
            lastActiveAt: now,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        deviceOwnership: ownership,
        isNewDevice: true,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        deviceService.upsertForLoginInTx.mockResolvedValue(upsert);
        deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue([]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLogoutUseCase,
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(UserLogoutUseCase);
    });

    describe('execute', () => {
        it('revokes the session, clears the device notification, and adds the logout entry on one transaction', async () => {
            const callOrder: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            outboxService.addInTx.mockImplementation(async () => {
                callOrder.push('addInTx');

                return 'outbox-id';
            });
            deviceService.clearNotificationInTx.mockImplementation(async () => {
                callOrder.push('clearNotificationInTx');
            });

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext)
            ).resolves.toEqual({});

            expect(sessionService.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'user-bramble',
                now
            );
            expect(deviceService.clearNotificationInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'device-ownership-bramble',
                'user-bramble',
                now
            );
            expect(sessionService.revokeInTx).toHaveBeenCalledBefore(
                deviceService.clearNotificationInTx
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userLogout }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(callOrder).toEqual([
                'clearNotificationInTx',
                'addInTx',
                'committed',
            ]);
        });

        it('rethrows the not-found of the guarded revoke without clearing the device or adding the entry', async () => {
            const failure = new SessionNotFoundException();
            outboxService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            sessionService.revokeInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext)
            ).rejects.toBe(failure);
            expect(deviceService.clearNotificationInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('answers SessionNotFoundException on a write conflict with one run and no entry', async () => {
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext)
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('wraps any other failure raised while logging out in the unknown exception without an entry', async () => {
            const failure = new Error('boom');
            outboxService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
