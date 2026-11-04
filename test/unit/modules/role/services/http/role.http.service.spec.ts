import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import {
    RoleDefaultAvailableOrderBy,
    RoleDefaultAvailableSearch,
    RoleDefaultType,
} from '@modules/role/constants/role.list.constant';
import type { RoleAdminListRequestDto } from '@modules/role/dtos/request/role.admin-list.request.dto';
import type { RoleSystemListRequestDto } from '@modules/role/dtos/request/role.system-list.request.dto';
import type { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import type { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleUtil } from '@modules/role/utils/role.util';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    IRoleActor,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { RoleHttpService } from '@modules/role/services/http/role.http.service';
import type {
    IPaginationCursorReturn,
    IPaginationOffsetReturn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';

describe('RoleHttpService', () => {
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const roleUtil: MockProxy<RoleUtil> = mock<RoleUtil>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: Role = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const roleWithPolicies: IRoleWithPolicies = { ...role, policies: [] };
    const actorRole: IRoleWithPolicies = {
        ...roleWithPolicies,
        id: 'role-actor',
        type: EnumRoleType.superAdmin,
    };
    const actorUser: IUser = {
        id: 'user-actor',
        name: null,
        username: 'actor',
        isVerified: true,
        verifiedAt: now,
        email: 'actor@example.com',
        roleId: actorRole.id,
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
        role: actorRole,
        twoFactor: null,
    };
    const actor: IRoleActor = {
        roleId: actorRole.id,
        roleType: EnumRoleType.superAdmin,
    };
    const metadata = { roleId: role.id };
    const stagedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminRoleCreate,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const offsetPagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput> =
        { skip: 0, limit: 20, orderBy: [] };
    const cursorPagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput> =
        {
            firstPageAt: new Date('2026-01-01T00:00:00.000Z'),
            limit: 20,
            orderBy: [],
        };

    let service: RoleHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        roleUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogDomain.prepare.mockReturnValue(stagedActivityLog);
        paginationQueryUtil.offset.mockReturnValue({
            params: offsetPagination,
            storePatch: {},
        });
        paginationQueryUtil.cursor.mockReturnValue({
            params: cursorPagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleHttpService,
                { provide: RoleDomain, useValue: roleDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RoleUtil, useValue: roleUtil },
            ],
        }).compile();

        service = module.get(RoleHttpService);
    });

    describe('getListOffsetByAdmin', () => {
        it('parses the offset query, merges the type filter, and maps policy count rows', async () => {
            const query: RoleAdminListRequestDto = { type: 'admin' };
            const typeFilter = {
                where: { type: { in: [EnumRoleType.admin] } },
                storeFilter: { type: [EnumRoleType.admin] },
            };
            paginationQueryUtil.inEnum.mockReturnValue(typeFilter);
            const offsetPage: IPaginationOffsetReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ ...role, _count: { policies: 3 } }],
            };
            roleDomain.getListOffsetByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListOffsetByAdmin(query);

            expect(result).toEqual({
                type: 'offset',
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [{ ...role, policies: 3 }],
            });
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.RoleScalarFieldEnum.type,
                query.type,
                RoleDefaultType
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { type: [EnumRoleType.admin] } }
            );
            expect(roleDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                typeFilter.where
            );
        });

        it('merges an empty filter set when type is absent', async () => {
            const query: RoleAdminListRequestDto = {};
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const emptyOffsetPage: IPaginationOffsetReturn<IRoleWithPolicyCount> =
                {
                    type: EnumPaginationType.offset,
                    count: 0,
                    perPage: 20,
                    page: 1,
                    totalPage: 0,
                    hasNext: false,
                    hasPrevious: false,
                    data: [],
                };
            roleDomain.getListOffsetByAdmin.mockResolvedValue(emptyOffsetPage);

            await service.getListOffsetByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(roleDomain.getListOffsetByAdmin).toHaveBeenCalledWith(
                offsetPagination,
                undefined
            );
        });
    });

    describe('getListCursorBySystem', () => {
        it('parses the cursor query, merges the type filter, and maps policy count rows', async () => {
            const query: RoleSystemListRequestDto = { type: 'admin' };
            const typeFilter = {
                where: { type: { in: [EnumRoleType.admin] } },
                storeFilter: { type: [EnumRoleType.admin] },
            };
            paginationQueryUtil.inEnum.mockReturnValue(typeFilter);
            const cursorPage: IPaginationCursorReturn<IRoleWithPolicyCount> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [{ ...role, _count: { policies: 2 } }],
            };
            roleDomain.getListCursorBySystem.mockResolvedValue(cursorPage);

            const result = await service.getListCursorBySystem(query);

            expect(result).toEqual({
                type: 'cursor',
                perPage: 20,
                hasNext: false,
                data: [{ ...role, policies: 2 }],
            });
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: RoleDefaultAvailableSearch,
                availableOrderBy: RoleDefaultAvailableOrderBy,
            });
            expect(roleDomain.getListCursorBySystem).toHaveBeenCalledWith(
                cursorPagination,
                typeFilter.where
            );
        });

        it('merges an empty filter set when type is absent', async () => {
            const query: RoleSystemListRequestDto = {};
            paginationQueryUtil.inEnum.mockReturnValue(null);
            const emptyCursorPage: IPaginationCursorReturn<IRoleWithPolicyCount> =
                {
                    type: EnumPaginationType.cursor,
                    perPage: 20,
                    hasNext: false,
                    data: [],
                };
            roleDomain.getListCursorBySystem.mockResolvedValue(emptyCursorPage);

            await service.getListCursorBySystem(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(roleDomain.getListCursorBySystem).toHaveBeenCalledWith(
                cursorPagination,
                undefined
            );
        });
    });

    describe('getOne', () => {
        it('wraps the domain role in the response envelope', async () => {
            roleDomain.getOne.mockResolvedValue(roleWithPolicies);

            const result = await service.getOne(roleWithPolicies.id);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleDomain.getOne).toHaveBeenCalledWith(roleWithPolicies.id);
        });
    });

    describe('createByAdmin', () => {
        it('creates the role and wraps the result', async () => {
            const body: RoleCreateRequestDto = {
                name: 'manager',
                type: EnumRoleType.admin,
            };
            databaseUtil.createId.mockReturnValue(role.id);
            roleDomain.createByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await service.createByAdmin(body, actorUser);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleDomain.createByAdmin).toHaveBeenCalledWith(
                role.id,
                {
                    name: 'manager',
                    description: null,
                    type: EnumRoleType.admin,
                },
                actor
            );
        });

        it('prepares the create activity log with the drawn id before the write and stages it after', async () => {
            const body: RoleCreateRequestDto = {
                name: 'manager',
                type: EnumRoleType.admin,
            };
            databaseUtil.createId.mockReturnValue(role.id);
            roleDomain.createByAdmin.mockImplementation(async () => {
                expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                    action: EnumActivityLogAction.adminRoleCreate,
                    metadata,
                });
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();

                return roleWithPolicies;
            });

            await service.createByAdmin(body, actorUser);

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                { id: role.id, name: 'manager', type: EnumRoleType.admin },
                now
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('stages nothing when the domain throws', async () => {
            const body: RoleCreateRequestDto = {
                name: 'manager',
                type: EnumRoleType.admin,
            };
            databaseUtil.createId.mockReturnValue(role.id);
            roleDomain.createByAdmin.mockRejectedValue(new Error('boom'));

            await expect(
                service.createByAdmin(body, actorUser)
            ).rejects.toThrow('boom');
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('updateByAdmin', () => {
        it('updates the role and wraps the result', async () => {
            const body: RoleUpdateRequestDto = {
                description: 'Team lead role',
                type: EnumRoleType.user,
            };
            roleDomain.updateByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await service.updateByAdmin(
                roleWithPolicies.id,
                body,
                actorUser
            );

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleDomain.updateByAdmin).toHaveBeenCalledWith(
                roleWithPolicies.id,
                { description: 'Team lead role', type: EnumRoleType.user },
                actor
            );
        });

        it('prepares the update activity log from the updated role and stages it after the write', async () => {
            const body: RoleUpdateRequestDto = {
                description: 'Team lead role',
                type: EnumRoleType.user,
            };
            roleDomain.updateByAdmin.mockResolvedValue(roleWithPolicies);

            await service.updateByAdmin(roleWithPolicies.id, body, actorUser);

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                roleWithPolicies,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminRoleUpdate,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });

        it('passes a null description through to clear it', async () => {
            const body: RoleUpdateRequestDto = {
                description: null,
                type: EnumRoleType.user,
            };
            roleDomain.updateByAdmin.mockResolvedValue(roleWithPolicies);

            await service.updateByAdmin(roleWithPolicies.id, body, actorUser);

            expect(roleDomain.updateByAdmin).toHaveBeenCalledWith(
                roleWithPolicies.id,
                { description: null, type: EnumRoleType.user },
                actor
            );
        });
    });

    describe('deleteByAdmin', () => {
        it('deletes the role and returns an empty response', async () => {
            roleDomain.deleteByAdmin.mockResolvedValue(roleWithPolicies);

            const result = await service.deleteByAdmin(
                roleWithPolicies.id,
                actorUser
            );

            expect(result).toEqual({});
            expect(roleDomain.deleteByAdmin).toHaveBeenCalledWith(
                roleWithPolicies.id,
                actor
            );
        });

        it('prepares the delete activity log from the deleted role and stages it after the write', async () => {
            roleDomain.deleteByAdmin.mockResolvedValue(role);

            await service.deleteByAdmin(roleWithPolicies.id, actorUser);

            expect(roleUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                role,
                now
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminRoleDelete,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                stagedActivityLog,
            ]);
        });
    });
});
