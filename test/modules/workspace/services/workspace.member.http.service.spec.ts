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
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';

describe('WorkspaceMemberHttpService', () => {
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const accessibleMemberWhere: Prisma.WorkspaceMemberWhereInput = {
        workspaceId: 'workspace-id',
    };
    const now = new Date('2026-01-01T00:00:00.000Z');
    const workspace = {
        id: 'workspace-id',
        name: 'Acme',
        slug: 'acme',
        description: null,
        isPublic: false,
        createdAt: now,
        createdBy: 'user-id',
        updatedAt: now,
        updatedBy: 'user-id',
        deletedAt: null,
        deletedBy: null,
    } satisfies Workspace;
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
        policyAbilityDomain.scope.mockReturnValue(accessibleMemberWhere);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberHttpService,
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
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

        it('authorizes update on the workspace and transfers', async () => {
            await service.transferOwnership(workspace, actorMember, dto);

            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
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

        it.each([
            ['PolicyForbiddenException', new PolicyForbiddenException()],
            [
                'RequestContextMissingException',
                new RequestContextMissingException(PolicyAbilityStoreKey),
            ],
        ])(
            'propagates %s from authorize and does not transfer',
            async (_name, error) => {
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.transferOwnership(workspace, actorMember, dto)
                ).rejects.toThrow(error);
                expect(
                    workspaceMemberDomain.transferOwnership
                ).not.toHaveBeenCalled();
            }
        );
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

            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceMember
            );
        });

        it('throws RequestContextMissingException when no ability is stored and never lists', async () => {
            policyAbilityDomain.scope.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.getMembersList('workspace-id', {})
            ).rejects.toThrow(RequestContextMissingException);
            expect(workspaceMemberDomain.getMembersList).not.toHaveBeenCalled();
        });

        it('propagates the policy rejection when the ability holds no read rule and never lists', async () => {
            policyAbilityDomain.scope.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getMembersList('workspace-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceMemberDomain.getMembersList).not.toHaveBeenCalled();
        });
    });

    describe('updateMemberRole', () => {
        const dto = {
            roleId: 'admin-role-id',
        } satisfies WorkspaceMemberUpdateRoleRequestDto;

        it('loads the member by identity, authorizes update, and writes', async () => {
            workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                targetMember
            );

            await service.updateMemberRole(
                'workspace-id',
                actorMember,
                targetMember.id,
                dto
            );

            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).toHaveBeenCalledWith('workspace-id', targetMember.id);
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
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

        it('does not authorize or write when the lookup throws WorkspaceMemberNotFoundException', async () => {
            workspaceMemberDomain.getOneByIdAndWorkspace.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                service.updateMemberRole(
                    'workspace-id',
                    actorMember,
                    targetMember.id,
                    dto
                )
            ).rejects.toThrow(WorkspaceMemberNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(
                workspaceMemberDomain.updateMemberRole
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['PolicyForbiddenException', new PolicyForbiddenException()],
            [
                'RequestContextMissingException',
                new RequestContextMissingException(PolicyAbilityStoreKey),
            ],
        ])(
            'propagates %s from authorize and does not write',
            async (_name, error) => {
                workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                    targetMember
                );
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.updateMemberRole(
                        'workspace-id',
                        actorMember,
                        targetMember.id,
                        dto
                    )
                ).rejects.toThrow(error);
                expect(
                    workspaceMemberDomain.updateMemberRole
                ).not.toHaveBeenCalled();
            }
        );
    });

    describe('removeMember', () => {
        it('loads the member by identity, authorizes delete, and writes', async () => {
            workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                targetMember
            );

            await service.removeMember(
                'workspace-id',
                actorMember,
                targetMember.id
            );

            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).toHaveBeenCalledWith('workspace-id', targetMember.id);
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.WorkspaceMember, targetMember)
            );
            expect(workspaceMemberDomain.removeMember).toHaveBeenCalledWith(
                'workspace-id',
                actorMember,
                targetMember
            );
        });

        it('does not authorize or write when the lookup throws WorkspaceMemberNotFoundException', async () => {
            workspaceMemberDomain.getOneByIdAndWorkspace.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(
                service.removeMember(
                    'workspace-id',
                    actorMember,
                    targetMember.id
                )
            ).rejects.toThrow(WorkspaceMemberNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(workspaceMemberDomain.removeMember).not.toHaveBeenCalled();
        });

        it.each([
            ['PolicyForbiddenException', new PolicyForbiddenException()],
            [
                'RequestContextMissingException',
                new RequestContextMissingException(PolicyAbilityStoreKey),
            ],
        ])(
            'propagates %s from authorize and does not write',
            async (_name, error) => {
                workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
                    targetMember
                );
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.removeMember(
                        'workspace-id',
                        actorMember,
                        targetMember.id
                    )
                ).rejects.toThrow(error);
                expect(
                    workspaceMemberDomain.removeMember
                ).not.toHaveBeenCalled();
            }
        );
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
            workspaceDomain.getByIdForAdmin.mockResolvedValue(workspace);
            workspaceMemberDomain.getMembersListForAdmin.mockResolvedValue(
                offsetPage
            );

            const result = await service.getMembersListForAdmin(
                'workspace-id',
                query
            );

            expect(workspaceDomain.getByIdForAdmin).toHaveBeenCalledWith(
                'workspace-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                offsetStorePatch
            );
            expect(policyAbilityDomain.scope).toHaveBeenCalledTimes(1);
            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceMember
            );
            expect(
                workspaceMemberDomain.getMembersListForAdmin
            ).toHaveBeenCalledWith(
                'workspace-id',
                offsetParams,
                accessibleMemberWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('authorizes the parent workspace before scoping the member list', async () => {
            const callOrder: string[] = [];
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            workspaceDomain.getByIdForAdmin.mockImplementation(async () => {
                callOrder.push('parent');
                return workspace;
            });
            policyAbilityDomain.authorize.mockImplementation(() => {
                callOrder.push('authorize');
            });
            policyAbilityDomain.scope.mockImplementation(() => {
                callOrder.push('scope');
                return accessibleMemberWhere;
            });
            workspaceMemberDomain.getMembersListForAdmin.mockImplementation(
                async () => {
                    callOrder.push('list');
                    return offsetPage;
                }
            );

            await service.getMembersListForAdmin('workspace-id', {
                page: 1,
                perPage: 20,
            });

            expect(workspaceDomain.getByIdForAdmin).toHaveBeenCalledWith(
                'workspace-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(callOrder).toEqual(['parent', 'authorize', 'scope', 'list']);
        });

        it('throws WorkspaceNotFoundException and never authorizes or lists when the parent lookup misses', async () => {
            workspaceDomain.getByIdForAdmin.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                service.getMembersListForAdmin('workspace-id', {
                    page: 1,
                    perPage: 20,
                })
            ).rejects.toThrow(WorkspaceNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(
                workspaceMemberDomain.getMembersListForAdmin
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['PolicyForbiddenException', new PolicyForbiddenException()],
            [
                'RequestContextMissingException',
                new RequestContextMissingException(PolicyAbilityStoreKey),
            ],
        ])(
            'propagates %s from authorize and does not scope or list',
            async (_name, error) => {
                workspaceDomain.getByIdForAdmin.mockResolvedValue(workspace);
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.getMembersListForAdmin('workspace-id', {
                        page: 1,
                        perPage: 20,
                    })
                ).rejects.toThrow(error);
                expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
                expect(
                    workspaceMemberDomain.getMembersListForAdmin
                ).not.toHaveBeenCalled();
            }
        );

        it('propagates PolicyForbiddenException from the member scope and does not list', async () => {
            workspaceDomain.getByIdForAdmin.mockResolvedValue(workspace);
            policyAbilityDomain.scope.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getMembersListForAdmin('workspace-id', {
                    page: 1,
                    perPage: 20,
                })
            ).rejects.toThrow(PolicyForbiddenException);
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(
                workspaceMemberDomain.getMembersListForAdmin
            ).not.toHaveBeenCalled();
        });
    });
});
