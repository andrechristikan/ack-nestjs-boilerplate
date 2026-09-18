import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    EnumPolicyAction,
    EnumPolicySubject,
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
import { RolePredefinedNotFoundException } from '@modules/role/exceptions/role.predefined-not-found.exception';
import { RoleUsedException } from '@modules/role/exceptions/role.used.exception';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';

describe('RoleDomain', () => {
    const roleRepository = {
        existsByName: vi.fn<RoleRepository['existsByName']>(),
        existsById: vi.fn<RoleRepository['existsById']>(),
        create: vi.fn<RoleRepository['create']>(),
        isUsedById: vi.fn<RoleRepository['isUsedById']>(),
        delete: vi.fn<RoleRepository['delete']>(),
    } satisfies Pick<
        RoleRepository,
        'existsByName' | 'existsById' | 'create' | 'isUsedById' | 'delete'
    >;
    const roleUtil = {
        mapActivityLogMetadata: vi.fn<RoleUtil['mapActivityLogMetadata']>(),
    } satisfies Pick<RoleUtil, 'mapActivityLogMetadata'>;
    const activityLogDomain = {
        stage: vi.fn<ActivityLogDomain['stage']>(),
    } satisfies Pick<ActivityLogDomain, 'stage'>;
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
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RoleDomain,
                { provide: RoleRepository, useValue: roleRepository },
                { provide: RoleUtil, useValue: roleUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
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
        roleRepository.existsById.mockResolvedValue(true);
        roleRepository.isUsedById.mockResolvedValue(true);

        await expect(service.deleteByAdmin(role.id)).rejects.toBeInstanceOf(
            RoleUsedException
        );
        expect(roleRepository.delete).not.toHaveBeenCalled();
    });
});
