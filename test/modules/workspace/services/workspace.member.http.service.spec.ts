import { subject } from '@casl/ability';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Prisma, Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { WorkspaceMemberDefaultAvailableOrderBy } from '@modules/workspace/constants/workspace.list.constant';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { WorkspaceMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.member-list.request.dto';
import type { WorkspaceMemberUpdateRoleRequestDto } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import type {
    IWorkspaceMember,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';

describe('WorkspaceMemberHttpService', () => {
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const accessibleMemberWhere: Prisma.WorkspaceMemberWhereInput = {
        workspaceId: 'workspace-id',
    };
    const now = new Date('2026-01-01T00:00:00.000Z');
    const actorMember = {
        id: 'member-id',
        workspaceId: 'workspace-id',
        userId: 'user-id',
        roleId: 'owner-role-id',
        role: {
            id: 'owner-role-id',
            scope: EnumRoleScope.workspace,
            key: EnumRoleWorkspaceKey.owner,
            name: 'Owner',
        },
        joinedAt: now,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    } satisfies IWorkspaceMemberWithRole;
    const targetMember = {
        ...actorMember,
        id: 'target-member-id',
        userId: 'target-user-id',
        roleId: 'member-role-id',
        role: {
            id: 'member-role-id',
            scope: EnumRoleScope.workspace,
            key: EnumRoleWorkspaceKey.member,
            name: 'Member',
        },
    } satisfies IWorkspaceMemberWithRole;
    const memberListItem = {
        id: 'member-id',
        workspaceId: 'workspace-id',
        userId: 'user-id',
        roleId: 'member-role-id',
        role: {
            id: 'member-role-id',
            scope: EnumRoleScope.workspace,
            key: EnumRoleWorkspaceKey.member,
            name: 'Member',
        },
        joinedAt: now,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        user: {
            id: 'user-id',
            name: 'User',
            username: 'user',
            photo: null,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
    } satisfies IWorkspaceMember;
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [memberListItem],
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [memberListItem],
    };
    const cursorParams = {
        where: undefined,
        limit: 20,
        cursor: undefined,
        cursorField: 'id',
        orderBy: [],
    };
    const cursorStorePatch = {
        perPage: 20,
        cursor: undefined,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['joinedAt'],
    };
    const offsetParams = {
        where: undefined,
        limit: 20,
        skip: 0,
        orderBy: [],
    };
    const offsetStorePatch = {
        page: 1,
        perPage: 20,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['joinedAt'],
    };

    let service: WorkspaceMemberHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.requireStored.mockReturnValue(ability);
        policyAbilityDomain.requireAccessibleWhere.mockReturnValue(
            accessibleMemberWhere
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberHttpService,
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(WorkspaceMemberHttpService);
    });

    describe('transferOwnership', () => {
        const dto = {
            targetUserId: 'target-user-id',
        } satisfies WorkspaceTransferOwnershipRequestDto;
        const workspace = { id: 'workspace-id' } as Workspace;

        it('checks Workspace update on the workspace record, then delegates to the domain', async () => {
            await service.transferOwnership(workspace, actorMember, dto);

            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(
                workspaceMemberDomain.transferOwnership
            ).toHaveBeenCalledWith(
                'workspace-id',
                actorMember,
                'target-user-id'
            );
        });

        it('does not call the domain when the policy denies the workspace', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.transferOwnership(workspace, actorMember, dto)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                workspaceMemberDomain.transferOwnership
            ).not.toHaveBeenCalled();
        });
    });

    describe('leaveWorkspace', () => {
        it('delegates to the domain', async () => {
            await service.leaveWorkspace('workspace-id', actorMember);

            expect(workspaceMemberDomain.leaveWorkspace).toHaveBeenCalledWith(
                'workspace-id',
                actorMember
            );
        });
    });

    describe('getMembersList', () => {
        it('merges the role filter into the store patch when a role is provided', async () => {
            const query = {
                role: 'admin',
            } satisfies WorkspaceMemberListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { role: { in: ['admin'] } },
                storeFilter: { role: ['admin'] },
            } as never);
            workspaceMemberDomain.getMembersList.mockResolvedValue(cursorPage);

            const result = await service.getMembersList('workspace-id', query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                'role',
                'admin',
                [
                    EnumRoleWorkspaceKey.owner,
                    EnumRoleWorkspaceKey.admin,
                    EnumRoleWorkspaceKey.member,
                ]
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: { role: ['admin'] },
                }
            );
            expect(workspaceMemberDomain.getMembersList).toHaveBeenCalledWith(
                'workspace-id',
                cursorParams,
                { role: { in: ['admin'] } },
                accessibleMemberWhere
            );
            expect(result).toEqual(cursorPage);
        });

        it('merges an empty filter set when no role is provided', async () => {
            const query = {} satisfies WorkspaceMemberListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            workspaceMemberDomain.getMembersList.mockResolvedValue(cursorPage);

            await service.getMembersList('workspace-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: {},
                }
            );
            expect(workspaceMemberDomain.getMembersList).toHaveBeenCalledWith(
                'workspace-id',
                cursorParams,
                undefined,
                accessibleMemberWhere
            );
        });

        it('asks the policy domain for the read predicate of the stored ability', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            workspaceMemberDomain.getMembersList.mockResolvedValue(cursorPage);

            await service.getMembersList('workspace-id', {});

            expect(policyAbilityDomain.requireStored).toHaveBeenCalledWith(
                PolicyAbilityStoreKey
            );
            expect(
                policyAbilityDomain.requireAccessibleWhere
            ).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceMember
            );
        });

        it('throws RequestContextMissingException when no ability is stored and never lists', async () => {
            policyAbilityDomain.requireStored.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getMembersList('workspace-id', {})
            ).rejects.toThrow(RequestContextMissingException);
            expect(workspaceMemberDomain.getMembersList).not.toHaveBeenCalled();
        });

        it('propagates the policy rejection when the ability holds no read rule and never lists', async () => {
            policyAbilityDomain.requireAccessibleWhere.mockImplementation(
                () => {
                    throw new PolicyForbiddenException();
                }
            );

            await expect(
                service.getMembersList('workspace-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceMemberDomain.getMembersList).not.toHaveBeenCalled();
        });
    });

    describe('updateMemberRole', () => {
        it('delegates to the domain with the new role id', async () => {
            const dto = {
                roleId: 'admin-role-id',
            } satisfies WorkspaceMemberUpdateRoleRequestDto;

            workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                targetMember
            );
            await service.updateMemberRole(
                'workspace-id',
                actorMember,
                targetMember.id,
                dto
            );

            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                subject(EnumPolicySubject.WorkspaceMember, targetMember)
            );
            expect(workspaceMemberDomain.updateMemberRole).toHaveBeenCalledWith(
                'workspace-id',
                actorMember,
                targetMember,
                'admin-role-id'
            );
        });

        it('does not call the domain when the policy denies the target member', async () => {
            workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                targetMember
            );
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.updateMemberRole(
                    'workspace-id',
                    actorMember,
                    targetMember.id,
                    { roleId: 'admin-role-id' }
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                workspaceMemberDomain.updateMemberRole
            ).not.toHaveBeenCalled();
        });
    });

    describe('removeMember', () => {
        it('delegates to the domain', async () => {
            workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                targetMember
            );
            await service.removeMember(
                'workspace-id',
                actorMember,
                targetMember.id
            );

            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.WorkspaceMember, targetMember)
            );
            expect(workspaceMemberDomain.removeMember).toHaveBeenCalledWith(
                'workspace-id',
                actorMember,
                targetMember
            );
        });

        it('does not call the domain when the policy denies the target member', async () => {
            workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                targetMember
            );
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.removeMember(
                    'workspace-id',
                    actorMember,
                    targetMember.id
                )
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceMemberDomain.removeMember).not.toHaveBeenCalled();
        });
    });

    describe('getMembersListForAdmin', () => {
        it('merges the offset store patch and wraps the domain page', async () => {
            const query = {
                page: 1,
                perPage: 20,
            } satisfies WorkspaceAdminMemberListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            workspaceMemberDomain.getMembersListForAdmin.mockResolvedValue(
                offsetPage
            );

            const result = await service.getMembersListForAdmin(
                'workspace-id',
                query
            );

            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                offsetStorePatch
            );
            expect(
                workspaceMemberDomain.getMembersListForAdmin
            ).toHaveBeenCalledWith('workspace-id', offsetParams);
            expect(result).toEqual(offsetPage);
        });
    });
});
