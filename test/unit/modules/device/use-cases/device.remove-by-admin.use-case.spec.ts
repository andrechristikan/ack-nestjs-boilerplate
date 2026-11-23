import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { DeviceNotFoundException } from '@modules/device/exceptions/device.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionService } from '@modules/session/services/session.service';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { DeviceRemoveByAdminUseCase } from '@modules/device/use-cases/device.remove-by-admin.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('DeviceRemoveByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'User'> = { id: 'scoped-1' };
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const admin: IUser = {
        id: 'admin-1',
        name: 'Admin One',
        username: 'admin.main',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'admin@example.com',
        roleId: 'role-admin',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
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
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-admin',
            scope: EnumRoleScope.platform,
            key: 'admin',
            name: 'admin',
            policyRevision: 0,
        },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(admin);
    const authContext = buildAuthJwtAccessContext(admin.id);
    const userRole: IRole = {
        id: 'role-user',
        name: 'user',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policyRevision: 0,
        description: null,
        isImmutable: false,
    };
    let useCase: DeviceRemoveByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                DeviceRemoveByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: RoleService, useValue: roleService },
            ],
        }).compile();

        useCase = module.get(DeviceRemoveByAdminUseCase);
    });

    describe('execute', () => {
        it('checks the rank, then removes attributed to the admin passing the request context', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            sessionService.removeDeviceOwnershipByAdmin.mockResolvedValue();

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-1',
                'device-ownership-1'
            );

            expect(result).toEqual({});
            expect(roleService.getOneByUserId).toHaveBeenCalledWith(
                'user-1',
                scoped
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRolePlatformKey.admin,
                expect.objectContaining({
                    scope: EnumRoleScope.platform,
                    key: EnumRolePlatformKey.user,
                })
            );
            expect(
                sessionService.removeDeviceOwnershipByAdmin
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'device-ownership-1',
                scoped
            );
            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.delete,
                EnumPolicySubject.DeviceOwnership
            );
        });

        it('rethrows the removal exception', async () => {
            const notFound = new DeviceNotFoundException();
            roleService.getOneByUserId.mockResolvedValue(userRole);
            sessionService.removeDeviceOwnershipByAdmin.mockRejectedValue(
                notFound
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    policyContext,
                    'user-1',
                    'device-ownership-1'
                )
            ).rejects.toBe(notFound);
        });

        it('removes nothing when the actor does not outrank the target', async () => {
            const rankForbidden = new RoleRankForbiddenException();
            roleService.getOneByUserId.mockResolvedValue({
                ...userRole,
                scope: EnumRoleScope.platform,
                key: EnumRolePlatformKey.superAdmin,
                policyRevision: 0,
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
                    policyContext,
                    'user-1',
                    'device-ownership-1'
                )
            ).rejects.toBe(rankForbidden);
            expect(
                sessionService.removeDeviceOwnershipByAdmin
            ).not.toHaveBeenCalled();
        });
    });
});
