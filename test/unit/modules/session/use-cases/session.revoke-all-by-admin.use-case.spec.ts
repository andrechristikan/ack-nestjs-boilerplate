import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionRevokeAllByAdminUseCase } from '@modules/session/use-cases/session.revoke-all-by-admin.use-case';

describe('SessionRevokeAllByAdminUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const revokedAt = new Date('2026-01-05T00:00:00.000Z');
    const context: IRequestContext = {
        actorUserId: 'admin-1',
        workspaceId: null,
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    };
    const userRole: IRole = {
        id: 'role-user',
        name: 'user',
        type: EnumRoleType.user,
        isImmutable: false,
    };
    const superAdminRole: IRole = {
        id: 'role-root',
        name: 'superadmin',
        type: EnumRoleType.superAdmin,
        isImmutable: false,
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
            name: 'admin',
            description: null,
            type: EnumRoleType.admin,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    let useCase: SessionRevokeAllByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeAllByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: RoleService, useValue: roleService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        useCase = module.get(SessionRevokeAllByAdminUseCase);
    });

    describe('execute', () => {
        it('asserts not self before the rank gate', async () => {
            const notSelf = new UserNotSelfException();
            sessionService.assertNotSelf.mockImplementation(() => {
                throw notSelf;
            });

            const rejection = useCase.execute('admin-1', admin, context);

            await expect(rejection).rejects.toBe(notSelf);
            expect(roleService.getOneByUserId).not.toHaveBeenCalled();
            expect(sessionService.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('rethrows the rank exception and revokes nothing when the actor does not outrank the target', async () => {
            roleService.getOneByUserId.mockResolvedValue(superAdminRole);
            const rankForbidden = new RoleRankForbiddenException();
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = useCase.execute('root-1', admin, context);

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.superAdmin
            );
            expect(sessionService.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('revokes every session as the admin passing the request context', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const refs: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];
            sessionService.revokeAllByAdmin.mockResolvedValue(refs);

            const result = await useCase.execute('user-1', admin, context);

            expect(result).toEqual({});
            expect(sessionService.assertNotSelf).toHaveBeenCalledWith(
                'user-1',
                'admin-1'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(sessionService.revokeAllByAdmin).toHaveBeenCalledWith(
                'user-1',
                'admin-1',
                revokedAt,
                context
            );
        });

        it('rethrows the domain exception', async () => {
            roleService.getOneByUserId.mockResolvedValue(userRole);
            helperDateService.create.mockReturnValue(revokedAt);
            const failure = new SessionNotFoundException();
            sessionService.revokeAllByAdmin.mockRejectedValue(failure);

            const rejection = useCase.execute('user-1', admin, context);

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
