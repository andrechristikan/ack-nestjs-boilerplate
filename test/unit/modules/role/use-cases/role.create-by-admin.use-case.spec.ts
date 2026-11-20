import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
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
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    IRoleActor,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { RoleCreateByAdminUseCase } from '@modules/role/use-cases/role.create-by-admin.use-case';

describe('RoleCreateByAdminUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
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
    const metadata = {
        roleId: role.id,
        roleName: role.name,
        roleType: role.type,
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

    let useCase: RoleCreateByAdminUseCase;
    let databaseUtil: DatabaseUtil;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        activityLogService.recordEffect.mockReturnValue(effect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleCreateByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                RoleUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(RoleCreateByAdminUseCase);
        databaseUtil = module.get(DatabaseUtil);
    });

    describe('execute', () => {
        const body: RoleCreateRequestDto = {
            name: 'manager',
            type: EnumRoleType.admin,
        };

        it('creates the role on the outbox transaction and wraps the result', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue(role.id);
            roleService.createByAdminInTx.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleService.createByAdminInTx).toHaveBeenCalledWith(
                tx,
                role.id,
                {
                    name: 'manager',
                    description: null,
                    type: EnumRoleType.admin,
                },
                actor
            );
        });

        it('adds the create activity entry from the drawn id and the passed context on the same tx', async () => {
            vi.spyOn(databaseUtil, 'createId').mockReturnValue(role.id);
            roleService.createByAdminInTx.mockResolvedValue(roleWithPolicies);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                body
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.adminRoleCreate, metadata }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('adds no entry when the write throws', async () => {
            const failure = new Error('create failed');
            vi.spyOn(databaseUtil, 'createId').mockReturnValue(role.id);
            roleService.createByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    body
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
