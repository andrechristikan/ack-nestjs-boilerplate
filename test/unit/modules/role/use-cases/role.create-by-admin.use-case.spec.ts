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
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
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
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminRoleCreate,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    let useCase: RoleCreateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleCreateByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleUtil, useValue: roleUtil },
            ],
        }).compile();

        useCase = module.get(RoleCreateByAdminUseCase);
    });

    describe('execute', () => {
        it('creates the role and wraps the result', async () => {
            const body: RoleCreateRequestDto = {
                name: 'manager',
                type: EnumRoleType.admin,
            };
            databaseUtil.createId.mockReturnValue(role.id);
            roleService.createByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(body, actorUser);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleService.createByAdmin).toHaveBeenCalledWith(
                role.id,
                {
                    name: 'manager',
                    description: null,
                    type: EnumRoleType.admin,
                },
                actor
            );
        });

        it('prepares the create activity log with the drawn id before the write and stages it after', async () => {
            const body: RoleCreateRequestDto = {
                name: 'manager',
                type: EnumRoleType.admin,
            };
            databaseUtil.createId.mockReturnValue(role.id);
            roleService.createByAdmin.mockImplementation(async () => {
                expect(activityLogService.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.adminRoleCreate,
                    metadata,
                });
                expect(activityLogService.stagePrepared).not.toHaveBeenCalled();

                return roleWithPolicies;
            });

            await useCase.execute(body, actorUser);

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: role.id,
                    name: 'manager',
                    type: EnumRoleType.admin,
                    isImmutable: false,
                },
                now
            );
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            const body: RoleCreateRequestDto = {
                name: 'manager',
                type: EnumRoleType.admin,
            };
            databaseUtil.createId.mockReturnValue(role.id);
            roleService.createByAdmin.mockRejectedValue(new Error('boom'));

            await expect(useCase.execute(body, actorUser)).rejects.toThrow(
                'boom'
            );
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
