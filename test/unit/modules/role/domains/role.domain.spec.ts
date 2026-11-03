import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Prisma, Role } from '@generated/prisma-client/client';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IRoleActor,
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
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

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

    const superAdminActor: IRoleActor = {
        roleId: 'role-root',
        roleType: EnumRoleType.superAdmin,
    };
    const adminActor: IRoleActor = {
        roleId: 'role-actor',
        roleType: EnumRoleType.admin,
    };
    const superAdminRole: Role = {
        ...role,
        id: 'role-root',
        name: 'superadmin',
        type: EnumRoleType.superAdmin,
    };

    let domain: RoleDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        roleUtil.outranks.mockReturnValue(true);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleDomain,
                { provide: RoleRepository, useValue: roleRepository },
                { provide: RoleUtil, useValue: roleUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
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

    describe('getById', () => {
        it('returns the role the repository reads', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            const result = await domain.getById(role.id);

            expect(result).toBe(role);
        });

        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(domain.getById('missing')).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
        });
    });

    describe('getByName', () => {
        it('returns the role the repository reads', async () => {
            roleRepository.findOneByName.mockResolvedValue(role);

            const result = await domain.getByName(role.name);

            expect(result).toBe(role);
            expect(roleRepository.findOneByName).toHaveBeenCalledWith(
                role.name
            );
        });

        it('throws RoleNotFoundException when no role carries the name', async () => {
            roleRepository.findOneByName.mockResolvedValue(null);

            await expect(domain.getByName('missing')).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
        });
    });

    describe('getOneByUserId', () => {
        it('throws UserNotFoundException when no role holds the user', async () => {
            roleRepository.findOneByUserId.mockResolvedValue(null);

            await expect(
                domain.getOneByUserId('missing')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'user.error.notFound',
            });
        });

        it('returns the role the user holds', async () => {
            roleRepository.findOneByUserId.mockResolvedValue(role);

            const result = await domain.getOneByUserId('user-1');

            expect(result).toBe(role);
            expect(roleRepository.findOneByUserId).toHaveBeenCalledWith(
                'user-1'
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

        it('throws RoleExistException when the create collides on the name index, with no read before the write', async () => {
            const collision = new Error('name collision');
            roleRepository.create.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                domain.createByAdmin(role.id, create, superAdminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.exist,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.exist],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'role.error.exist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'name'
            );
        });

        it('wraps a non-collision create error in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            roleRepository.create.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                domain.createByAdmin(role.id, create, superAdminActor)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('throws RoleRankForbiddenException when an admin creates an admin-type role', async () => {
            roleUtil.outranks.mockReturnValue(false);

            await expect(
                domain.createByAdmin(role.id, create, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.rankForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.rankForbidden',
            });
            expect(roleUtil.outranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.admin
            );
            expect(roleRepository.create).not.toHaveBeenCalled();
        });

        it('creates a user-type role for an admin actor', async () => {
            const userCreate: IRoleCreate = {
                ...create,
                type: EnumRoleType.user,
            };
            roleRepository.create.mockResolvedValue(roleWithPolicies);

            const result = await domain.createByAdmin(
                role.id,
                userCreate,
                adminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.create).toHaveBeenCalledWith(
                role.id,
                userCreate
            );
        });

        it('creates the role under the given id', async () => {
            roleRepository.create.mockResolvedValue(roleWithPolicies);

            const result = await domain.createByAdmin(
                role.id,
                create,
                superAdminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.create).toHaveBeenCalledWith(role.id, create);
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
                domain.updateByAdmin('missing', update, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
        });

        it('throws RoleSelfForbiddenException when the actor updates the role they hold', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                domain.updateByAdmin(role.id, update, {
                    roleId: role.id,
                    roleType: EnumRoleType.admin,
                })
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.selfForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.selfForbidden',
            });
            expect(roleRepository.update).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin updates a superAdmin role', async () => {
            roleRepository.findOneById.mockResolvedValue(superAdminRole);
            roleUtil.outranks.mockReturnValue(false);

            await expect(
                domain.updateByAdmin(superAdminRole.id, update, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.rankForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.rankForbidden',
            });
            expect(roleRepository.update).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin updates an admin role', async () => {
            roleRepository.findOneById.mockResolvedValue(role);
            roleUtil.outranks.mockReturnValue(false);

            await expect(
                domain.updateByAdmin(role.id, update, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.rankForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.rankForbidden',
            });
            expect(roleRepository.update).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin raises a user role to admin', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...role,
                type: EnumRoleType.user,
            });
            roleUtil.outranks
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false);

            await expect(
                domain.updateByAdmin(
                    role.id,
                    { description: null, type: EnumRoleType.admin },
                    adminActor
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.rankForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.rankForbidden',
            });
            expect(roleRepository.update).not.toHaveBeenCalled();
        });

        it('updates a user role for an admin actor', async () => {
            roleRepository.findOneById.mockResolvedValue({
                ...role,
                type: EnumRoleType.user,
            });
            roleRepository.update.mockResolvedValue(roleWithPolicies);

            const result = await domain.updateByAdmin(
                role.id,
                update,
                adminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.update).toHaveBeenCalledWith(role.id, update);
        });

        it('updates the role and returns it', async () => {
            roleRepository.findOneById.mockResolvedValue(role);
            roleRepository.update.mockResolvedValue(roleWithPolicies);

            const result = await domain.updateByAdmin(
                role.id,
                update,
                superAdminActor
            );

            expect(result).toBe(roleWithPolicies);
            expect(roleRepository.update).toHaveBeenCalledWith(role.id, update);
        });
    });

    describe('deleteByAdmin', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.deleteByAdmin('missing', adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
            expect(roleRepository.deleteUnused).not.toHaveBeenCalled();
        });

        it('throws RoleUsedException when the guarded delete matches no unused role', async () => {
            roleRepository.findOneById.mockResolvedValue(role);
            roleRepository.deleteUnused.mockResolvedValue(false);

            await expect(
                domain.deleteByAdmin(role.id, superAdminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.used,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.used],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'role.error.used',
            });
            expect(roleRepository.deleteUnused).toHaveBeenCalledWith(role.id);
        });

        it('throws RoleSelfForbiddenException when the actor deletes the role they hold', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                domain.deleteByAdmin(role.id, {
                    roleId: role.id,
                    roleType: EnumRoleType.superAdmin,
                })
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.selfForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.selfForbidden',
            });
            expect(roleRepository.deleteUnused).not.toHaveBeenCalled();
        });

        it('throws RoleRankForbiddenException when an admin deletes a superAdmin role', async () => {
            roleRepository.findOneById.mockResolvedValue(superAdminRole);
            roleUtil.outranks.mockReturnValue(false);

            await expect(
                domain.deleteByAdmin(superAdminRole.id, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
                statusCodeKey:
                    EnumRoleStatusCodeError[
                        EnumRoleStatusCodeError.rankForbidden
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'role.error.rankForbidden',
            });
            expect(roleRepository.deleteUnused).not.toHaveBeenCalled();
        });

        it('deletes the unused role in one guarded statement and returns the role it read', async () => {
            roleRepository.findOneById.mockResolvedValue(role);
            roleRepository.deleteUnused.mockResolvedValue(true);

            const result = await domain.deleteByAdmin(role.id, superAdminActor);

            expect(result).toBe(role);
            expect(roleRepository.deleteUnused).toHaveBeenCalledWith(role.id);
        });
    });

    describe('assertExistsById', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.existsById.mockResolvedValue(false);

            await expect(
                domain.assertExistsById('missing')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'role.error.notFound',
            });
        });

        it('resolves when the role exists', async () => {
            roleRepository.existsById.mockResolvedValue(true);

            await expect(
                domain.assertExistsById(role.id)
            ).resolves.toBeUndefined();
            expect(roleRepository.existsById).toHaveBeenCalledWith(role.id);
        });
    });

    describe('assertWritableByActor', () => {
        it('throws RoleNotFoundException when the role does not exist', async () => {
            roleRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.assertWritableByActor('missing', adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
        });

        it('throws RoleSelfForbiddenException when the actor holds the role', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                domain.assertWritableByActor(role.id, {
                    roleId: role.id,
                    roleType: EnumRoleType.admin,
                })
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.selfForbidden,
                messagePath: 'role.error.selfForbidden',
            });
        });

        it('throws RoleRankForbiddenException when the actor does not outrank the role', async () => {
            roleRepository.findOneById.mockResolvedValue(superAdminRole);
            roleUtil.outranks.mockReturnValue(false);

            await expect(
                domain.assertWritableByActor(superAdminRole.id, adminActor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
                messagePath: 'role.error.rankForbidden',
            });
            expect(roleUtil.outranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.superAdmin
            );
        });

        it('resolves when the actor outranks a role it does not hold', async () => {
            roleRepository.findOneById.mockResolvedValue(role);

            await expect(
                domain.assertWritableByActor(role.id, superAdminActor)
            ).resolves.toBeUndefined();
        });
    });

    describe('assertActorOutranks', () => {
        it('passes when the util says the actor outranks the target', () => {
            roleUtil.outranks.mockReturnValue(true);

            expect(() =>
                domain.assertActorOutranks(
                    EnumRoleType.admin,
                    EnumRoleType.user
                )
            ).not.toThrow();
            expect(roleUtil.outranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
        });

        it('throws RoleRankForbiddenException when the util says the actor does not outrank the target', () => {
            roleUtil.outranks.mockReturnValue(false);

            expect(() =>
                domain.assertActorOutranks(
                    EnumRoleType.admin,
                    EnumRoleType.admin
                )
            ).toThrow(
                expect.objectContaining({
                    module: 'role',
                    statusCode: EnumRoleStatusCodeError.rankForbidden,
                    statusCodeKey:
                        EnumRoleStatusCodeError[
                            EnumRoleStatusCodeError.rankForbidden
                        ],
                    httpStatus: HttpStatus.FORBIDDEN,
                    messagePath: 'role.error.rankForbidden',
                })
            );
        });
    });

    describe('assertNotSelf', () => {
        it('passes for a different role id', () => {
            expect(() =>
                domain.assertNotSelf('role-a', 'role-b')
            ).not.toThrow();
        });

        it('throws RoleSelfForbiddenException for the same role id', () => {
            expect(() => domain.assertNotSelf('role-a', 'role-a')).toThrow(
                expect.objectContaining({
                    module: 'role',
                    statusCode: EnumRoleStatusCodeError.selfForbidden,
                    statusCodeKey:
                        EnumRoleStatusCodeError[
                            EnumRoleStatusCodeError.selfForbidden
                        ],
                    httpStatus: HttpStatus.FORBIDDEN,
                    messagePath: 'role.error.selfForbidden',
                })
            );
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
});
