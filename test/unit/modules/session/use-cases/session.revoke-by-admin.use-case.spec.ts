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
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type { ISession } from '@modules/session/interfaces/session.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionRevokeByAdminUseCase } from '@modules/session/use-cases/session.revoke-by-admin.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('SessionRevokeByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const scoped: IPolicyWhereInput<'User'> = { id: 'scoped-1' };
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const revokedAt = new Date('2026-01-05T00:00:00.000Z');
    const userRole: IRole = {
        id: 'role-user',
        name: 'user',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policyRevision: 0,
        description: null,
        isImmutable: false,
    };
    const superAdminRole: IRole = {
        id: 'role-root',
        name: 'superadmin',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.superAdmin,
        policyRevision: 0,
        description: null,
        isImmutable: false,
    };
    const session: ISession = {
        id: 'session-1',
        userId: 'user-1',
        deviceOwnershipId: 'device-ownership-1',
        jtiDigest: 'jti-value',
        ipAddress: '127.0.0.1',
        userAgent: {
            ua: null,
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        geoLocation: null,
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        lastActiveAt: new Date('2026-01-01T00:00:00.000Z'),
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        user: {
            id: 'user-1',
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
        revokedBy: null,
    };
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
    let useCase: SessionRevokeByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(scoped);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                SessionRevokeByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: RoleService, useValue: roleService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(SessionRevokeByAdminUseCase);
    });

    describe('execute', () => {
        it('checks rank, then revokes as the admin passing the request context', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            sessionService.revokeByAdmin.mockResolvedValue(session);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-1',
                'session-1'
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
            expect(sessionService.revokeByAdmin).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'session-1',
                revokedAt
            );
        });

        it('rethrows the rank exception and revokes nothing when the actor does not outrank the target', async () => {
            roleService.getOneByUserId.mockResolvedValue(superAdminRole);
            const rankForbidden = new RoleRankForbiddenException();
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'root-1',
                'session-1'
            );

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(sessionService.revokeByAdmin).not.toHaveBeenCalled();
        });

        it('rethrows the domain exception', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const failure = new SessionNotFoundException();
            sessionService.revokeByAdmin.mockRejectedValue(failure);

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                policyContext,
                'user-1',
                'session-1'
            );

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
