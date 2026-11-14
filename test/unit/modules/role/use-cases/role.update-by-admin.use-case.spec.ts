import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    IRoleActor,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { RoleUpdateByAdminUseCase } from '@modules/role/use-cases/role.update-by-admin.use-case';

describe('RoleUpdateByAdminUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleUtil: MockProxy<RoleUtil> = mock<RoleUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

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
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(actorUser);
    const authContext = buildAuthJwtAccessContext(actorUser.id);
    const effect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };

    let useCase: RoleUpdateByAdminUseCase;

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
                RoleUpdateByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleUtil, useValue: roleUtil },
            ],
        }).compile();

        useCase = module.get(RoleUpdateByAdminUseCase);
    });

    describe('execute', () => {
        const body: RoleUpdateRequestDto = {
            description: 'Team lead role',
            type: EnumRoleType.user,
        };

        it('updates the role on the outbox transaction and wraps the result', async () => {
            roleService.updateByAdminInTx.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                roleWithPolicies.id,
                body
            );

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                roleWithPolicies.id,
                { description: 'Team lead role', type: EnumRoleType.user },
                actor
            );
        });

        it('adds the update activity entry from the updated role and the passed context on the same tx', async () => {
            roleService.updateByAdminInTx.mockResolvedValue(roleWithPolicies);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                roleWithPolicies.id,
                body
            );

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                roleWithPolicies,
                now
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.adminRoleUpdate, metadata }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
        });

        it('passes a null description through to clear it', async () => {
            roleService.updateByAdminInTx.mockResolvedValue(roleWithPolicies);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                roleWithPolicies.id,
                {
                    description: null,
                    type: EnumRoleType.user,
                }
            );

            expect(roleService.updateByAdminInTx).toHaveBeenCalledWith(
                tx,
                roleWithPolicies.id,
                { description: null, type: EnumRoleType.user },
                actor
            );
        });

        it('rethrows a typed exception of the write', async () => {
            const failure = new RoleNotFoundException();
            roleService.updateByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    roleWithPolicies.id,
                    body
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('maps a write conflict to RoleNotFoundException', async () => {
            const conflict = new Error('conflict');
            roleService.updateByAdminInTx.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    roleWithPolicies.id,
                    body
                )
            ).rejects.toBeInstanceOf(RoleNotFoundException);
        });

        it('wraps any other error in AppUnknownException', async () => {
            const cause = new Error('boom');
            roleService.updateByAdminInTx.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    roleWithPolicies.id,
                    body
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: cause,
            });
        });
    });
});
