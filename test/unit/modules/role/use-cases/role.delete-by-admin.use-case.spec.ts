import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    EnumActivityLogAction,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { RoleImmutableException } from '@modules/role/exceptions/role.immutable.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import { RoleSelfForbiddenException } from '@modules/role/exceptions/role.self-forbidden.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    IRoleActor,
    IRoleDeletable,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { RoleDeleteByAdminUseCase } from '@modules/role/use-cases/role.delete-by-admin.use-case';

describe('RoleDeleteByAdminUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: Role = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
        isImmutable: false,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const deletableRole: IRoleDeletable = { ...role, users: [] };
    const roleWithPolicies: IRoleWithPolicies = { ...role, policies: [] };
    const actorRole: IRoleWithPolicies = {
        ...roleWithPolicies,
        id: 'role-actor',
        type: EnumRoleType.superAdmin,
    };
    const actorUser: IUser = {
        ...buildUser('user-actor', 'actor@example.com'),
        roleId: actorRole.id,
        role: actorRole,
    };
    const actor: IRoleActor = {
        roleId: actorRole.id,
        roleType: EnumRoleType.superAdmin,
    };
    const deleted: Role = { ...role, name: 'deleted' };
    const metadata = {
        roleId: deleted.id,
        roleName: deleted.name,
        roleType: deleted.type,
        timestamp: now,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(actorUser);
    const authContext = buildAuthJwtAccessContext(actorUser.id);
    const effect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: RoleDeleteByAdminUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogQueue.recordEffect.mockReturnValue(effect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleDeleteByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                RoleUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(RoleDeleteByAdminUseCase);
    });

    describe('execute', () => {
        beforeEach(() => {
            roleService.getDeletableByActor.mockResolvedValue(deletableRole);
        });

        it.each([
            ['RoleNotFoundException', new RoleNotFoundException()],
            ['RoleSelfForbiddenException', new RoleSelfForbiddenException()],
            ['RoleRankForbiddenException', new RoleRankForbiddenException()],
            ['RoleImmutableException', new RoleImmutableException()],
        ])(
            'throws %s from getDeletableByActor and opens no transaction',
            async (_name, failure) => {
                roleService.getDeletableByActor.mockRejectedValue(failure);

                await expect(
                    useCase.execute(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        userContext,
                        role.id
                    )
                ).rejects.toBe(failure);
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
            }
        );

        it('deletes the role on the outbox transaction and returns an empty envelope', async () => {
            roleService.deleteByAdminInTx.mockResolvedValue(deleted);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                role.id
            );

            expect(result).toEqual({});
            expect(roleService.getDeletableByActor).toHaveBeenCalledWith(
                actor,
                role.id
            );
            expect(roleService.deleteByAdminInTx).toHaveBeenCalledWith(
                tx,
                deletableRole
            );
        });

        it('adds the delete activity entry from the deleted role and the passed context on the same tx', async () => {
            roleService.deleteByAdminInTx.mockResolvedValue(deleted);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                role.id
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.adminRoleDeleted, metadata }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('passes a rejected exception of the write through untouched', async () => {
            const failure = new RoleUsedException();
            roleService.deleteByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    role.id
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('passes any other rejection through untouched', async () => {
            const cause = new Error('boom');
            roleService.deleteByAdminInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    role.id
                )
            ).rejects.toBe(cause);
        });
    });
});
