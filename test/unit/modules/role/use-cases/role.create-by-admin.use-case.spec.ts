import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
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
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleUtil: MockProxy<RoleUtil> = mock<RoleUtil>();
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
        id: 'user-actor',
        name: null,
        username: 'actor',
        isVerified: true,
        verifiedAt: now,
        email: 'actor@example.com',
        roleId: actorRole.id,
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: actorRole,
        twoFactor: null,
    };
    const actor: IRoleActor = {
        roleId: actorRole.id,
        roleType: EnumRoleType.superAdmin,
    };
    const metadata = { roleId: role.id };
    const context: IRequestContext = {
        actorUserId: actorUser.id,
        workspaceId: null,
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: { architecture: null },
                device: { type: null, vendor: null, model: null },
                engine: { name: null, version: null },
                os: { name: null, version: null },
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    };
    const effect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: RoleCreateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
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
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleUtil, useValue: roleUtil },
            ],
        }).compile();

        useCase = module.get(RoleCreateByAdminUseCase);
    });

    describe('execute', () => {
        const body: RoleCreateRequestDto = {
            name: 'manager',
            type: EnumRoleType.admin,
        };

        it('creates the role on the outbox transaction and wraps the result', async () => {
            databaseUtil.createId.mockReturnValue(role.id);
            roleService.createByAdminInTx.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(body, actorUser, context);

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
            databaseUtil.createId.mockReturnValue(role.id);
            roleService.createByAdminInTx.mockResolvedValue(roleWithPolicies);

            await useCase.execute(body, actorUser, context);

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: role.id,
                    name: 'manager',
                    type: EnumRoleType.admin,
                    isImmutable: false,
                },
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                { action: EnumActivityLogAction.adminRoleCreate, metadata },
                context
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('adds no entry when the write throws', async () => {
            const failure = new Error('create failed');
            databaseUtil.createId.mockReturnValue(role.id);
            roleService.createByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(body, actorUser, context)
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
