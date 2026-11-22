import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumRoleType,
} from '@generated/prisma-client/client';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumDeviceStatusCodeError } from '@modules/device/enums/device.status-code.enum';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import type { IDeviceOwnership } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserService } from '@modules/user/services/user.service';
import { DeviceRemoveByAdminUseCase } from '@modules/device/use-cases/device.remove-by-admin.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('DeviceRemoveByAdminUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-01-08T00:00:00.000Z');
    const admin: IUser = {
        ...buildUser('admin-1', 'admin@example.com'),
        role: {
            id: 'role-admin',
            name: 'admin',
            description: null,
            type: EnumRoleType.admin,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(admin);
    const authContext = buildAuthJwtAccessContext(admin.id);
    const userRole: IRole = {
        id: 'role-user',
        name: 'user',
        type: EnumRoleType.user,
        isImmutable: false,
    };
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
    const actorEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'actor',
    };
    const targetEffect: IActivityLogCreateManyEffect = {
        ...actorEffect,
        idempotencyKey: 'target',
    };
    let useCase: DeviceRemoveByAdminUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        activityLogQueue.recordEffect
            .mockReturnValueOnce(actorEffect)
            .mockReturnValueOnce(targetEffect);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeviceRemoveByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: DeviceService, useValue: deviceService },
                { provide: RoleService, useValue: roleService },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                DatabaseUtil,
                DeviceUtil,
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(DeviceRemoveByAdminUseCase);
    });

    describe('execute', () => {
        it('checks the rank, then revokes and removes on one tx and adds the actor and target entries in one addManyInTx after the removal when the admin removes another user device', async () => {
            userService.getRoleById.mockResolvedValue(userRole);
            const callOrder: string[] = [];
            sessionService.revokeByDeviceOwnershipInTx.mockImplementation(
                async () => {
                    callOrder.push('revokeByDeviceOwnershipInTx');

                    return [{ id: 'session-1' }];
                }
            );
            deviceService.removeOwnershipInTx.mockImplementation(async () => {
                callOrder.push('removeOwnershipInTx');

                return deviceOwnership;
            });
            outboxService.addManyInTx.mockImplementation(async () => {
                callOrder.push('addManyInTx');

                return ['outbox-id-1', 'outbox-id-2'];
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1',
                'device-ownership-1'
            );

            expect(result).toEqual({});
            expect(userService.getRoleById).toHaveBeenCalledWith('user-1');
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
            expect(deviceService.removeOwnershipInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'device-ownership-1',
                'admin-1',
                now
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminDeviceRemoved,
                    metadata: {
                        deviceOwnershipId: 'device-ownership-1',
                        deviceId: 'device-1',
                        sessionCount: 1,
                        targetUserId: 'user-1',
                        targetUsername: 'jane',
                        timestamp: now,
                    },
                }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                2,
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userDeviceRemovedByAdmin,
                    userId: 'user-1',
                    createdBy: 'admin-1',
                    metadata: {
                        deviceOwnershipId: 'device-ownership-1',
                        deviceId: 'device-1',
                        sessionCount: 1,
                        actorUserId: 'admin-1',
                        timestamp: now,
                    },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEffect,
                targetEffect,
            ]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'revokeByDeviceOwnershipInTx',
                'removeOwnershipInTx',
                'addManyInTx',
            ]);
        });

        it('adds only the actor entry when the admin removes their own device', async () => {
            userService.getRoleById.mockResolvedValue({
                ...userRole,
                type: EnumRoleType.admin,
            });
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue([]);
            deviceService.removeOwnershipInTx.mockResolvedValue({
                ...deviceOwnership,
                userId: 'admin-1',
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'admin-1',
                'device-ownership-1'
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                actorEffect,
            ]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows the removal exception', async () => {
            const notFound = new DeviceNotFoundException();
            userService.getRoleById.mockResolvedValue(userRole);
            sessionService.revokeByDeviceOwnershipInTx.mockResolvedValue([]);
            deviceService.removeOwnershipInTx.mockRejectedValue(notFound);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-1',
                    'device-ownership-1'
                )
            ).rejects.toBe(notFound);
        });

        it('answers DeviceNotFoundException on a write conflict', async () => {
            userService.getRoleById.mockResolvedValue(userRole);
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2034')
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-1',
                    'device-ownership-1'
                )
            ).rejects.toMatchObject({
                constructor: DeviceNotFoundException,
                module: 'device',
                statusCode: EnumDeviceStatusCodeError.notFound,
            });
        });

        it('wraps any other failure in the unknown exception', async () => {
            userService.getRoleById.mockResolvedValue(userRole);
            const failure = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-1',
                    'device-ownership-1'
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
        });

        it('opens no transaction when the actor does not outrank the target', async () => {
            const rankForbidden = new RoleRankForbiddenException();
            userService.getRoleById.mockResolvedValue({
                ...userRole,
                type: EnumRoleType.superAdmin,
            });
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-1',
                    'device-ownership-1'
                )
            ).rejects.toBe(rankForbidden);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                sessionService.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(deviceService.removeOwnershipInTx).not.toHaveBeenCalled();
        });
    });
});
