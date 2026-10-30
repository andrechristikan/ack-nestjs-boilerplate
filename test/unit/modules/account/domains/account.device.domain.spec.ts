import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumDevicePlatform } from '@generated/prisma-client/client';
import { AccountDeviceDomain } from '@modules/account/domains/account.device.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';

describe('AccountDeviceDomain', () => {
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const now: Date = new Date('2026-01-01T00:00:00.000Z');
    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const deviceOwnership: IDeviceOwnership = {
        id: 'device-ownership-1',
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
        deviceId: 'device-1',
        userId: 'user-1',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        notificationToken: null,
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        device: {
            id: 'device-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
            updatedBy: 'user-1',
            fingerprint: 'abc123def456ghi789jkl012mno345pq',
            name: 'iPhone 12',
            platform: EnumDevicePlatform.ios,
            lastActiveAt: now,
        },
        user: {
            id: 'user-1',
            createdAt: now,
            createdBy: 'user-1',
            updatedAt: now,
            updatedBy: 'user-1',
            deletedAt: null,
            deletedBy: null,
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
        },
        revokedBy: null,
        _count: { sessions: 2 },
    };
    const revokedSessions = [{ id: 'session-1' }, { id: 'session-2' }];

    let domain: AccountDeviceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountDeviceDomain,
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = module.get(AccountDeviceDomain);
    });

    describe('remove', () => {
        it('throws before opening a transaction when the ownership is not active', async () => {
            deviceDomain.assertActive.mockRejectedValue(
                new DeviceNotFoundException()
            );

            await expect(
                domain.remove('user-1', 'device-ownership-1')
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
                messagePath: 'device.error.notFound',
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes the sessions then removes the ownership on one transaction attributed to the owner', async () => {
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(now);
            const calls: string[] = [];
            sessionDomain.revokeByDeviceOwnershipInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revokedSessions;
                }
            );
            deviceDomain.removeOwnershipInTx.mockImplementation(async () => {
                calls.push('removeOwnership');

                return deviceOwnership;
            });
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            const result = await domain.remove('user-1', 'device-ownership-1');

            expect(result).toEqual({ deviceOwnership, revokedSessions });
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(deviceDomain.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'user-1',
                now
            );
            expect(calls).toEqual(['revokeSessions', 'removeOwnership']);
        });

        it('rethrows an AppBaseException raised inside the transaction unchanged', async () => {
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(now);
            const notFound = new DeviceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(notFound);

            await expect(
                domain.remove('user-1', 'device-ownership-1')
            ).rejects.toBe(notFound);
        });

        it('wraps a non-application error raised inside the transaction', async () => {
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(now);
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                domain.remove('user-1', 'device-ownership-1')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
        });
    });

    describe('removeByAdmin', () => {
        it('throws before opening a transaction when the ownership is not active', async () => {
            deviceDomain.assertActive.mockRejectedValue(
                new DeviceNotFoundException()
            );

            await expect(
                domain.removeByAdmin('user-1', 'device-ownership-1', 'admin-1')
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('revokes the sessions then removes the ownership on one transaction attributed to the admin', async () => {
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(now);
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedSessions
            );
            deviceDomain.removeOwnershipInTx.mockResolvedValue(deviceOwnership);
            databaseService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );

            const result = await domain.removeByAdmin(
                'user-1',
                'device-ownership-1',
                'admin-1'
            );

            expect(result).toEqual({ deviceOwnership, revokedSessions });
            expect(deviceDomain.assertActive).toHaveBeenCalledWith(
                'user-1',
                'device-ownership-1'
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
            expect(deviceDomain.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
        });

        it('wraps a non-application error raised inside the transaction', async () => {
            deviceDomain.assertActive.mockResolvedValue(undefined);
            helperDateService.create.mockReturnValue(now);
            const cause = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                domain.removeByAdmin('user-1', 'device-ownership-1', 'admin-1')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
        });
    });
});
