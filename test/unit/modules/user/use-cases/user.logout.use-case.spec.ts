import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
} from '@generated/prisma-client/client';
import type { DeviceOwnership } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { DeviceService } from '@modules/device/services/device.service';
import type { IDeviceLoginUpsert } from '@modules/device/interfaces/device.interface';
import { SessionService } from '@modules/session/services/session.service';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserLogoutUseCase } from '@modules/user/use-cases/user.logout.use-case';

describe('UserLogoutUseCase', () => {
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserLogoutUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const requestLog: IRequestLog = {
        userAgent: {
            ua: 'ua',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
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

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        sessionService.getRequestLog.mockReturnValue(requestLog);
        activityLogService.prepare.mockReturnValue(activityLog);
        deviceService.upsertForLoginInTx.mockResolvedValue(upsert);
        deviceService.getOtherOwnershipIdsByDeviceInTx.mockResolvedValue([]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLogoutUseCase,
                { provide: DeviceService, useValue: deviceService },
                { provide: SessionService, useValue: sessionService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(UserLogoutUseCase);
    });

    describe('execute', () => {
        it('revokes the session and clears the device notification on one transaction, then purges the session and stages the logout row', async () => {
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                useCase.execute(
                    'user-bramble',
                    'session-bramble',
                    'device-ownership-bramble'
                )
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
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                [{ id: 'session-bramble' }]
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLogout,
            });
            expect(callOrder).toEqual([
                'committed',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('rethrows the not-found of the guarded revoke without clearing the device, purging, or staging', async () => {
            const failure = new SessionNotFoundException();
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            sessionService.revokeInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute('user-bramble', 'session-bramble', 'device')
            ).rejects.toBe(failure);
            expect(deviceService.clearNotificationInTx).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('answers SessionNotFoundException on a write conflict with one run, no purge, and no staged row', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute('user-bramble', 'session-bramble', 'device')
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
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps any other failure raised while logging out in the unknown exception without purging or staging', async () => {
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute('user-bramble', 'session-bramble', 'device')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
