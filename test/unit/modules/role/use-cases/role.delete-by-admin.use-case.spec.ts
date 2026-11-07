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
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    IRoleActor,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { RoleDeleteByAdminUseCase } from '@modules/role/use-cases/role.delete-by-admin.use-case';

describe('RoleDeleteByAdminUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
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

    let useCase: RoleDeleteByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogService.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleDeleteByAdminUseCase,
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleUtil, useValue: roleUtil },
            ],
        }).compile();

        useCase = module.get(RoleDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('deletes the role and returns an empty response', async () => {
            roleService.deleteByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(
                roleWithPolicies.id,
                actorUser
            );

            expect(result).toEqual({});
            expect(roleService.deleteByAdmin).toHaveBeenCalledWith(
                roleWithPolicies.id,
                actor
            );
        });

        it('prepares the delete activity log from the deleted role and stages it after the write', async () => {
            roleService.deleteByAdmin.mockResolvedValue(role);

            await useCase.execute(roleWithPolicies.id, actorUser);

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                role,
                now
            );
            expect(activityLogService.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminRoleDelete,
                metadata,
            });
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
