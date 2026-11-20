import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { UserService } from '@modules/user/services/user.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { SessionService } from '@modules/session/services/session.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionUtil } from '@modules/session/utils/session.util';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import type { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserUpdateStatusByAdminUseCase } from '@modules/user/use-cases/user.update-status-by-admin.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';

describe('UserUpdateStatusByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const sessionService: MockProxy<SessionService> = mock<SessionService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();

    let useCase: UserUpdateStatusByAdminUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-05T00:00:00.000Z');
    const baseUser: IUser = buildUser('user-cinder', 'cinder@example.com');

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserUpdateStatusByAdminUseCase,
                { provide: UserService, useValue: userService },
                { provide: SessionService, useValue: sessionService },
                { provide: OutboxService, useValue: outboxService },
                HelperDateService,
                { provide: RoleService, useValue: roleService },
                { provide: ActivityLogService, useValue: activityLogService },
                SessionUtil,
                UserUtil,
                DatabaseUtil,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitUserConfigValues),
                },
            ],
        }).compile();
        useCase = module.get(UserUpdateStatusByAdminUseCase);
    });

    describe('execute', () => {
        const revoked: ISessionRef[] = [{ id: 'session-one' }];

        const row = {
            ...baseUser,
            status: EnumUserStatus.inactive,
        };

        const admin: IUser = {
            ...baseUser,
            id: 'admin-cinder',
            role: { ...baseUser.role, type: EnumRoleType.admin },
        };
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const userContext = buildUserContext(admin);
        const authContext = buildAuthJwtAccessContext(admin.id);

        beforeEach(() => {
            activityLogService.recordEffect.mockImplementation(
                (
                    _requestContext,
                    _apiKeyContext,
                    _authContext,
                    _workspaceContext,
                    input
                ) => buildActivityLogCreateManyEffect(input.action)
            );
            userService.getOneWithRole.mockResolvedValue({
                ...baseUser,
                passwordAttempt: 3,
                passwordLockedUntil: null,
            });
            userService.revokesSessionsOn.mockReturnValue(true);
            userService.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userUpdateStatus
            );
        });

        it('gates the rank, writes the status and the revoke on one transaction and adds the revoke-all entries before the status entries on it', async () => {
            const calls: string[] = [];
            outboxService.withTransaction.mockImplementation(async fn => {
                calls.push('begin');
                const value = await fn(tx);
                calls.push('commit');

                return value as never;
            });
            userService.updateStatusByAdminInTx.mockImplementation(async () => {
                calls.push('updateStatus');

                return row;
            });
            sessionService.revokeActiveByUserInTx.mockImplementation(
                async () => {
                    calls.push('revokeSessions');

                    return revoked;
                }
            );
            userService.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
            const dto: UserUpdateStatusRequestDto = {
                status: EnumUserStatus.blocked,
            };

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-cinder',
                    dto
                )
            ).resolves.toEqual({});

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-cinder',
                'admin-cinder'
            );
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(userService.updateStatusByAdminInTx).toHaveBeenCalledWith(
                tx,
                { ...baseUser, passwordAttempt: 3 },
                EnumUserStatus.blocked
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'admin-cinder',
                now
            );
            expect(calls).toEqual([
                'begin',
                'updateStatus',
                'revokeSessions',
                'commit',
            ]);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminSessionRevokeAll,
                    metadata: { targetUserId: 'user-cinder', sessionCount: 1 },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userRevokeAllSessionsByAdmin,
                    userId: 'user-cinder',
                    createdBy: 'admin-cinder',
                    metadata: { actorUserId: 'admin-cinder', sessionCount: 1 },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminUserUpdateStatus,
                    metadata: {
                        targetUserId: 'user-cinder',
                        targetUsername: row.username,
                        timestamp: row.updatedAt,
                    },
                }
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.userBlocked,
                    userId: 'user-cinder',
                    createdBy: 'admin-cinder',
                    metadata: {
                        actorUserId: 'admin-cinder',
                        timestamp: row.updatedAt,
                    },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.adminSessionRevokeAll
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.userRevokeAllSessionsByAdmin
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.adminUserUpdateStatus
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.userBlocked
                ),
            ]);
        });

        it('reads the actor id from the context actorUserId', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, userId: 'admin-other' },
                userContext,
                'user-cinder',
                { status: EnumUserStatus.blocked }
            );

            expect(userService.assertNotSelf).toHaveBeenCalledWith(
                'user-cinder',
                'admin-other'
            );
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cinder',
                'admin-other',
                now
            );
        });

        it('records the plain status action for a status other than blocked', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-cinder',
                {
                    status: EnumUserStatus.inactive,
                }
            );

            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                expect.objectContaining({
                    action: EnumActivityLogAction.userUpdateStatus,
                })
            );
        });

        it('adds no revoke-all entry when no session was open', async () => {
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue([]);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-cinder',
                {
                    status: EnumUserStatus.inactive,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.adminUserUpdateStatus
                ),
                buildActivityLogCreateManyEffect(
                    EnumActivityLogAction.userUpdateStatus
                ),
            ]);
        });

        it('revokes no session when the status becomes active', async () => {
            userService.revokesSessionsOn.mockReturnValue(false);
            userService.updateStatusByAdminInTx.mockResolvedValue(row);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-cinder',
                {
                    status: EnumUserStatus.active,
                }
            );

            expect(userService.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.active
            );
            expect(
                sessionService.revokeActiveByUserInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
        });

        it('revokes sessions when the status becomes blocked and records userBlocked', async () => {
            userService.resolveStatusActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userBlocked
            );
            userService.updateStatusByAdminInTx.mockResolvedValue(row);
            sessionService.revokeActiveByUserInTx.mockResolvedValue(revoked);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                'user-cinder',
                {
                    status: EnumUserStatus.blocked,
                }
            );

            expect(userService.revokesSessionsOn).toHaveBeenCalledWith(
                EnumUserStatus.blocked
            );
            expect(
                userService.resolveStatusActivityLogAction
            ).toHaveBeenCalledWith(EnumUserStatus.blocked);
            expect(sessionService.revokeActiveByUserInTx).toHaveBeenCalledTimes(
                1
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                expect.objectContaining({
                    action: EnumActivityLogAction.userBlocked,
                })
            );
        });

        it('adds nothing and wraps the failure when the transaction fails', async () => {
            const cause = new Error('database exploded');
            outboxService.withTransaction.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toMatchObject({ rawError: cause });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('rethrows the status exception of the guarded write unchanged', async () => {
            const failure = new UserStatusInvalidException();
            outboxService.withTransaction.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toBe(failure);
        });

        it('answers UserStatusInvalidException when the guarded write conflicts', async () => {
            const conflict = buildPrismaKnownRequestError('P2034');
            outboxService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.statusInvalid,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('stops at the rank gate before the blocked gate', async () => {
            roleService.assertActorOutranks.mockImplementation(() => {
                throw new Error('rank');
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    'user-cinder',
                    {
                        status: EnumUserStatus.blocked,
                    }
                )
            ).rejects.toThrow('rank');
            expect(userService.assertUnblocked).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
        });
    });
});
