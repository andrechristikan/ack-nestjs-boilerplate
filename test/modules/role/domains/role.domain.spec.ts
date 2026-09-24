import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type Policy,
    type Role,
} from '@generated/prisma-client';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { RoleExistException } from '@modules/role/exceptions/role.exist.exception';
import { RoleForbiddenException } from '@modules/role/exceptions/role.forbidden.exception';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RolePredefinedNotFoundException } from '@modules/role/exceptions/role.predefined-not-found.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';

describe('RoleDomain', () => {
    const roleRepository: MockProxy<RoleRepository> = mock<RoleRepository>();
    const roleUtil: MockProxy<RoleUtil> = mock<RoleUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const policy = {
        id: 'policy-id',
        roleId: 'role-id',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read],
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Policy;
    const role = {
        id: 'role-id',
        name: 'Admin',
        description: null,
        type: EnumRoleType.admin,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies Role;
    const user = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: { ...role, policies: [policy] },
        twoFactor: null,
    } satisfies IUser;

    let service: RoleDomain;

    beforeEach(async () => {
        databaseUtil.createId.mockReturnValue('new-role-id');
        helperDateService.create.mockReturnValue(now);
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RoleDomain,
                { provide: RoleRepository, useValue: roleRepository },
                { provide: RoleUtil, useValue: roleUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = moduleRef.get(RoleDomain);
    });

    describe('validateRoleGuard', () => {
        it('rejects a missing authenticated user', async () => {
            await expect(
                service.validateRoleGuard(null, [EnumRoleType.admin])
            ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
        });

        it('allows super administrators without predefined role metadata', async () => {
            await expect(
                service.validateRoleGuard(
                    {
                        ...user,
                        role: { ...user.role, type: EnumRoleType.superAdmin },
                    },
                    []
                )
            ).resolves.toEqual([]);
        });

        it('rejects an ordinary route with no predefined roles', async () => {
            await expect(
                service.validateRoleGuard(user, [])
            ).rejects.toBeInstanceOf(RolePredefinedNotFoundException);
        });

        it('rejects a user whose role is outside the allow-list', async () => {
            await expect(
                service.validateRoleGuard(user, [EnumRoleType.user])
            ).rejects.toBeInstanceOf(RoleForbiddenException);
        });

        it('returns the allowed role policies for the policy guard', async () => {
            await expect(
                service.validateRoleGuard(user, [EnumRoleType.admin])
            ).resolves.toEqual([policy]);
        });
    });

    it('rejects creation when a role name already exists', async () => {
        roleRepository.existsByName.mockResolvedValue(true);

        await expect(
            service.createByAdmin({
                name: 'admin',
                type: EnumRoleType.admin,
                description: 'Duplicate',
            })
        ).rejects.toBeInstanceOf(RoleExistException);
        expect(roleRepository.create).not.toHaveBeenCalled();
    });

    it('rejects deletion while the role is assigned', async () => {
        roleRepository.findOneById.mockResolvedValue(role);
        roleRepository.isUsedById.mockResolvedValue(true);

        await expect(service.deleteByAdmin(role.id)).rejects.toBeInstanceOf(
            RoleUsedException
        );
        expect(roleRepository.delete).not.toHaveBeenCalled();
    });

    it('delegates admin and system lists', async () => {
        const pagination = { page: 1, perPage: 10 } as never;
        const filter = { type: { in: [EnumRoleType.admin] } } as never;
        const result = { data: [], pagination: {} } as never;
        roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
            result
        );
        roleRepository.findWithPaginationCursorBySystem.mockResolvedValue(
            result
        );

        await expect(
            service.getListOffsetByAdmin(pagination, filter)
        ).resolves.toBe(result);
        await expect(
            service.getListCursorBySystem(pagination, filter)
        ).resolves.toBe(result);
    });

    it('delegates existence and identity reads', async () => {
        roleRepository.existsById.mockResolvedValue(true);
        roleRepository.findOneById.mockResolvedValue(role);
        roleRepository.findOneByName.mockResolvedValue(role);

        await expect(service.existsById(role.id)).resolves.toBe(true);
        await expect(service.getById(role.id)).resolves.toBe(role);
        await expect(service.getByName(role.name)).resolves.toBe(role);
    });

    it('rejects an unknown role identity read', async () => {
        roleRepository.findOneWithPoliciesById.mockResolvedValue(null);

        await expect(service.getOne('missing')).rejects.toBeInstanceOf(
            RoleNotFoundException
        );
    });

    it('returns a role with policies', async () => {
        const withPolicies = { ...role, policies: [policy] };
        roleRepository.findOneWithPoliciesById.mockResolvedValue(withPolicies);

        await expect(service.getOne(role.id)).resolves.toBe(withPolicies);
    });

    it('creates a role with activity metadata', async () => {
        const data = {
            name: 'editor' as Lowercase<string>,
            type: EnumRoleType.user,
            description: 'Editor role',
        };
        const created = { ...role, id: 'new-role-id', ...data, policies: [] };
        const metadata = { roleId: 'new-role-id' } as never;
        roleRepository.existsByName.mockResolvedValue(false);
        roleRepository.create.mockResolvedValue(created);
        roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);

        await expect(service.createByAdmin(data)).resolves.toBe(created);
        expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
            { id: 'new-role-id', name: data.name, type: data.type },
            now
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.adminRoleCreate,
            metadata,
        });
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it('rejects updating an unknown role', async () => {
        roleRepository.findOneById.mockResolvedValue(null);

        await expect(
            service.updateByAdmin('missing', {
                type: EnumRoleType.user,
            })
        ).rejects.toBeInstanceOf(RoleNotFoundException);
    });

    it('updates a role and records its new type', async () => {
        const data = {
            type: EnumRoleType.user,
        };
        const updated = { ...role, ...data, policies: [] };
        roleRepository.findOneById.mockResolvedValue(role);
        roleRepository.update.mockResolvedValue(updated);

        await expect(service.updateByAdmin(role.id, data)).resolves.toBe(
            updated
        );
        expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
            { id: role.id, name: role.name, type: data.type },
            now
        );
    });

    it('rejects deleting an unknown role', async () => {
        roleRepository.findOneById.mockResolvedValue(null);
        roleRepository.isUsedById.mockResolvedValue(false);

        await expect(service.deleteByAdmin('missing')).rejects.toBeInstanceOf(
            RoleNotFoundException
        );
    });

    it('deletes an unused role and stages its activity', async () => {
        roleRepository.findOneById.mockResolvedValue(role);
        roleRepository.isUsedById.mockResolvedValue(false);
        roleRepository.delete.mockResolvedValue(role);

        await expect(service.deleteByAdmin(role.id)).resolves.toBe(role);
        expect(roleRepository.delete).toHaveBeenCalledWith(role.id);
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });
});
