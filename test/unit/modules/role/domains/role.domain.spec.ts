import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Prisma, Role } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type {
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('RoleDomain', () => {
    const roleRepository: MockProxy<RoleRepository> = mock<RoleRepository>();
    const roleUtil: MockProxy<RoleUtil> = mock<RoleUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const now = new Date('2026-01-15T00:00:00.000Z');
    const roleWithPolicies: IRoleWithPolicies = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
        policies: [],
    };
    const role: Role = {
        id: roleWithPolicies.id,
        name: roleWithPolicies.name,
        description: roleWithPolicies.description,
        type: roleWithPolicies.type,
        createdAt: roleWithPolicies.createdAt,
        createdBy: roleWithPolicies.createdBy,
        updatedAt: roleWithPolicies.updatedAt,
        updatedBy: roleWithPolicies.updatedBy,
    };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminRoleCreate,
        metadata: { roleId: role.id },
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    let domain: RoleDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleDomain,
                { provide: RoleRepository, useValue: roleRepository },
                { provide: RoleUtil, useValue: roleUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = module.get(RoleDomain);
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates the offset pagination read to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput> =
                {
                    skip: 0,
                    limit: 20,
                    orderBy: [],
                };
            const page: IPaginationOffsetReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(pagination);

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, null);
        });

        it('forwards the type filter to the repository', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            const type = { type: { in: ['admin'] } };
            roleRepository.findWithPaginationOffsetByAdmin.mockResolvedValue(
                page
            );

            const result = await domain.getListOffsetByAdmin(pagination, type);

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationOffsetByAdmin
            ).toHaveBeenCalledWith(pagination, type);
        });
    });

    describe('getListCursorBySystem', () => {
        it('delegates the cursor pagination read to the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput> =
                {
                    limit: 20,
                    orderBy: [],
                };
            const page: IPaginationCursorReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            roleRepository.findWithPaginationCursorBySystem.mockResolvedValue(
                page
            );

            const result = await domain.getListCursorBySystem(pagination);

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationCursorBySystem
            ).toHaveBeenCalledWith(pagination, null);
        });

        it('forwards the type filter to the repository', async () => {
            const pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput> =
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            const type = { type: { in: ['admin'] } };
            roleRepository.findWithPaginationCursorBySystem.mockResolvedValue(
                page
            );

            const result = await domain.getListCursorBySystem(pagination, type);

            expect(result).toBe(page);
            expect(
                roleRepository.findWithPaginationCursorBySystem
            ).toHaveBeenCalledWith(pagination, type);
        });
    });

    describe('existsById', () => {
        it('delegates the existence check to the repository', async () => {
            roleRepository.existsById.mockResolvedValue(true);

            const result = await domain.existsById(role.id);

            expect(result).toBe(true);
            expect(roleRepository.existsById).toHaveBeenCalledWith(role.id);
        });
    });

    describe('getById', () => {
        it('delegates the read to the repository', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            const result = await domain.getById(role.id);

            expect(result).toBe(role);
        });
    });

    describe('getByName', () => {
        it('delegates the read to the repository', async () => {
            roleRepository.findOneByName.mockResolvedValue(role);

            const result = await domain.getByName(role.name);

            expect(result).toBe(role);
            expect(roleRepository.findOneByName).toHaveBeenCalledWith(
                role.name
            );
        });
    });

    describe('getOne', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneWithPoliciesById.mockResolvedValue(null);

            await expect(domain.getOne('missing')).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
        });

        it('returns the role with its policies', async () => {
            roleRepository.findOneWithPoliciesById.mockResolvedValue(
                roleWithPolicies
            );

            const result = await domain.getOne(role.id);

            expect(result).toBe(roleWithPolicies);
        });
    });

    describe('createByAdmin', () => {
        const create: IRoleCreate = {
            name: 'manager',
            description: null,
            type: EnumRoleType.admin,
        };

        it('throws RoleExistException when the role name is taken', async () => {
            roleRepository.existsByName.mockResolvedValue(true);

            await expect(domain.createByAdmin(create)).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.exist,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.exist],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'role.error.exist',
            });
        });

        it('creates the role and stages the create activity log', async () => {
            roleRepository.existsByName.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue(role.id);
            roleRepository.create.mockResolvedValue(roleWithPolicies);

            const result = await domain.createByAdmin(create);

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.create).toHaveBeenCalledWith(role.id, create);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('updateByAdmin', () => {
        const update: IRoleUpdate = {
            description: null,
            type: EnumRoleType.user,
        };

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.updateByAdmin('missing', update)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
        });

        it('updates the role and stages the update activity log', async () => {
            roleRepository.findOneById.mockResolvedValue(role);
            roleRepository.update.mockResolvedValue(roleWithPolicies);

            const result = await domain.updateByAdmin(role.id, update);

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.update).toHaveBeenCalledWith(role.id, update);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('deleteByAdmin', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);
            roleRepository.isUsedById.mockResolvedValue(false);

            await expect(domain.deleteByAdmin('missing')).rejects.toMatchObject(
                {
                    module: 'role',
                    statusCode: EnumRoleStatusCodeError.notFound,
                    statusCodeKey:
                        EnumRoleStatusCodeError[
                            EnumRoleStatusCodeError.notFound
                        ],
                    httpStatus: HttpStatus.NOT_FOUND,
                    messagePath: 'role.error.notFound',
                }
            );
        });

        it('throws RoleUsedException when the role is still assigned to users', async () => {
            roleRepository.findOneById.mockResolvedValue(role);
            roleRepository.isUsedById.mockResolvedValue(true);

            await expect(domain.deleteByAdmin(role.id)).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.used,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.used],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'role.error.used',
            });
        });

        it('deletes the role and stages the delete activity log', async () => {
            roleRepository.findOneById.mockResolvedValue(role);
            roleRepository.isUsedById.mockResolvedValue(false);
            roleRepository.delete.mockResolvedValue(role);

            const result = await domain.deleteByAdmin(role.id);

            expect(result).toBe(role);
            expect(roleRepository.delete).toHaveBeenCalledWith(role.id);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });

    describe('validateRoleGuard', () => {
        const baseUser: IUser = {
            id: 'user-1',
            name: null,
            username: 'johnson',
            isVerified: false,
            verifiedAt: null,
            email: 'john@example.com',
            roleId: role.id,
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
            termPolicy: {
                termsOfService: true,
                privacy: true,
                marketing: false,
                cookies: true,
            },
            photo: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
            role: roleWithPolicies,
            twoFactor: null,
        };

        it('throws UserNotAuthenticatedException when the user is null', async () => {
            const rejection = domain.validateRoleGuard(null, [
                EnumRoleType.admin,
            ]);

            await expect(rejection).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notAuthenticated,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.notAuthenticated
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'user.error.notAuthenticated',
            });
        });

        it('returns an empty policy list for a superAdmin, bypassing the required roles', async () => {
            const user = {
                ...baseUser,
                role: { ...roleWithPolicies, type: EnumRoleType.superAdmin },
            };

            const result = await domain.validateRoleGuard(user, []);

            expect(result).toEqual([]);
        });

        it('throws RoleForbiddenException when the caller role is not in the required list', async () => {
            const user = {
                ...baseUser,
                role: { ...roleWithPolicies, type: EnumRoleType.user },
            };

            await expect(
                domain.validateRoleGuard(user, [EnumRoleType.admin])
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.forbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.forbidden],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.forbidden',
            });
        });

        it('returns the caller policies when the caller role is in the required list', async () => {
            const user = {
                ...baseUser,
                role: { ...roleWithPolicies, type: EnumRoleType.admin },
            };

            const result = await domain.validateRoleGuard(user, [
                EnumRoleType.admin,
            ]);

            expect(result).toBe(user.role.policies);
        });
    });

    describe('prepareActivityLog', () => {
        it('maps the metadata and prepares the activity log', () => {
            const metadata = { roleId: role.id };
            roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);

            const result = domain['prepareActivityLog'](
                EnumActivityLogAction.adminRoleCreate,
                roleWithPolicies,
                now
            );

            expect(result).toBe(stagedActivityLog);
            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                roleWithPolicies,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminRoleCreate,
                metadata,
            });
        });
    });
});
