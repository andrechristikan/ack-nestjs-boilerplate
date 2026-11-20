import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumRoleType } from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { RoleService } from '@modules/role/services/role.service';
import { UserService } from '@modules/user/services/user.service';
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
    const userService: MockProxy<UserService> = mock<UserService>();
    const revokedAt = new Date('2026-01-05T00:00:00.000Z');
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
        ...buildUser('admin-1', 'admin@example.com'),
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
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(admin);
    const authContext = buildAuthJwtAccessContext(admin.id);
    let useCase: SessionRevokeAllByAdminUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(revokedAt);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeAllByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: RoleService, useValue: roleService },
                { provide: UserService, useValue: userService },
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
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

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'admin-1'
            );

            await expect(rejection).rejects.toBe(notSelf);
            expect(userService.getRoleById).not.toHaveBeenCalled();
            expect(sessionService.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('rethrows the rank exception and revokes nothing when the actor does not outrank the target', async () => {
            userService.getRoleById.mockResolvedValue(superAdminRole);
            const rankForbidden = new RoleRankForbiddenException();
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'root-1'
            );

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.superAdmin
            );
            expect(sessionService.revokeAllByAdmin).not.toHaveBeenCalled();
        });

        it('revokes every session as the admin passing the request context', async () => {
            userService.getRoleById.mockResolvedValue(userRole);
            const refs: ISessionRef[] = [
                { id: 'session-1' },
                { id: 'session-2' },
            ];
            sessionService.revokeAllByAdmin.mockResolvedValue(refs);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1'
            );

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
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                revokedAt
            );
        });

        it('rethrows the domain exception', async () => {
            userService.getRoleById.mockResolvedValue(userRole);
            const failure = new SessionNotFoundException();
            sessionService.revokeAllByAdmin.mockRejectedValue(failure);

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1'
            );

            await expect(rejection).rejects.toBe(failure);
        });
    });
});
