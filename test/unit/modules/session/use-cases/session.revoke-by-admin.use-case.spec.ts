import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumRoleType } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
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
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type { ISession } from '@modules/session/interfaces/session.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { SessionRevokeByAdminUseCase } from '@modules/session/use-cases/session.revoke-by-admin.use-case';

describe('SessionRevokeByAdminUseCase', () => {
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx = {} as IDatabaseTransactionClient;
    const revokedAt = new Date('2026-01-05T00:00:00.000Z');
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
    const targetUser: IUser = {
        ...buildUser('user-1', 'jane@example.com'),
        role: {
            ...admin.role,
            id: 'role-user',
            name: 'user',
            type: EnumRoleType.user,
        },
    };
    const rootUser: IUser = {
        ...buildUser('root-1', 'root@example.com'),
        role: {
            ...admin.role,
            id: 'role-root',
            name: 'superadmin',
            type: EnumRoleType.superAdmin,
        },
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(admin);
    const authContext = buildAuthJwtAccessContext(admin.id);
    let useCase: SessionRevokeByAdminUseCase;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(revokedAt);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SessionRevokeByAdminUseCase,
                { provide: SessionService, useValue: sessionService },
                { provide: RoleService, useValue: roleService },
                { provide: UserService, useValue: userService },
                { provide: DatabaseService, useValue: databaseService },
                DatabaseUtil,
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(SessionRevokeByAdminUseCase);
    });

    describe('execute', () => {
        it('checks rank, then revokes as the admin passing the request context', async () => {
            userService.getOneWithRole.mockResolvedValue(targetUser);
            sessionService.revokeByAdminInTx.mockResolvedValue(session);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1',
                'session-1'
            );

            expect(result).toEqual({});
            expect(userService.getOneWithRole).toHaveBeenCalledWith('user-1');
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(sessionService.revokeByAdminInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'user-1',
                'session-1',
                revokedAt
            );
        });

        it('rethrows the rank exception and revokes nothing when the actor does not outrank the target', async () => {
            userService.getOneWithRole.mockResolvedValue(rootUser);
            const rankForbidden = new RoleRankForbiddenException();
            roleService.assertActorOutranks.mockImplementation(() => {
                throw rankForbidden;
            });

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'root-1',
                'session-1'
            );

            await expect(rejection).rejects.toBe(rankForbidden);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionService.revokeByAdminInTx).not.toHaveBeenCalled();
        });

        it('rethrows the domain exception', async () => {
            userService.getOneWithRole.mockResolvedValue(targetUser);
            const failure = new SessionNotFoundException();
            sessionService.revokeByAdminInTx.mockRejectedValue(failure);

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1',
                'session-1'
            );

            await expect(rejection).rejects.toBe(failure);
        });

        it('answers SessionNotFoundException on a write conflict', async () => {
            userService.getOneWithRole.mockResolvedValue(targetUser);
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2034')
            );

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1',
                'session-1'
            );

            await expect(rejection).rejects.toMatchObject({
                constructor: SessionNotFoundException,
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
            });
        });

        it('wraps any other failure in the unknown exception', async () => {
            userService.getOneWithRole.mockResolvedValue(targetUser);
            const failure = new Error('database exploded');
            databaseService.withTransaction.mockRejectedValue(failure);

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1',
                'session-1'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
        });

        it('rejects with the blocked-user exception and opens no transaction when the target is blocked', async () => {
            const blocked = new UserBlockedInvalidException();
            userService.getOneWithRole.mockResolvedValue(targetUser);
            userService.assertUnblocked.mockImplementation(() => {
                throw blocked;
            });

            const rejection = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-1',
                'session-1'
            );

            await expect(rejection).rejects.toMatchObject({
                module: 'user',
                statusCode: blocked.statusCode,
            });
            expect(userService.assertUnblocked).toHaveBeenCalledWith(
                targetUser
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
