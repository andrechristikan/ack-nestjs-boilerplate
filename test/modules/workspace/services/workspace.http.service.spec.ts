import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceSwitchRequestDto } from '@modules/workspace/dtos/request/workspace.switch.request.dto';
import type { WorkspaceUpdateIsPublicRequestDto } from '@modules/workspace/dtos/request/workspace.update-is-public.request.dto';
import type { WorkspaceUpdateSlugRequestDto } from '@modules/workspace/dtos/request/workspace.update-slug.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import type { WorkspaceUserListRequestDto } from '@modules/workspace/dtos/request/workspace.user-list.request.dto';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';

describe('WorkspaceHttpService', () => {
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
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
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [workspace],
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [workspace],
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
        availableSearch: ['slug', 'name'],
        availableOrderBy: ['createdAt'],
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
        availableSearch: ['slug', 'name'],
        availableOrderBy: ['createdAt', 'name'],
    };

    const accessibleWorkspaceWhere = { isPublic: true };

    let service: WorkspaceHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceHttpService,
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
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

        service = module.get(WorkspaceHttpService);
    });

    describe('getListForMember', () => {
        it('merges the store patch and wraps the domain page', async () => {
            const query = {} satisfies WorkspaceUserListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            workspaceDomain.getListForMember.mockResolvedValue(cursorPage);

            const result = await service.getListForMember('user-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                cursorStorePatch
            );
            expect(workspaceDomain.getListForMember).toHaveBeenCalledWith(
                'user-id',
                cursorParams
            );
            expect(result).toEqual(cursorPage);
        });
    });

    describe('createWorkspace', () => {
        it('delegates to the domain and wraps the created workspace', async () => {
            const dto = {
                name: 'Acme',
                description: 'Our team workspace',
                isPublic: true,
            } satisfies WorkspaceCreateRequestDto;
            workspaceDomain.createWorkspace.mockResolvedValue(workspace);

            const result = await service.createWorkspace('user-id', dto);

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.createWorkspace).toHaveBeenCalledWith(
                'user-id',
                {
                    name: dto.name,
                    description: dto.description,
                    isPublic: dto.isPublic,
                }
            );
        });
    });

    describe('getCurrentWorkspace', () => {
        const current = {
            ...workspace,
            name: 'Acme Current',
        } satisfies Workspace;

        it('re-reads by identity and authorizes read on that workspace', async () => {
            workspaceDomain.getCurrentWorkspace.mockResolvedValue(current);

            const result = await service.getCurrentWorkspace(workspace);

            expect(result).toEqual({ data: current });
            expect(workspaceDomain.getCurrentWorkspace).toHaveBeenCalledWith(
                'workspace-id'
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Workspace, current)
            );
        });

        it('propagates WorkspaceNotFoundException and does not authorize when the re-read misses', async () => {
            workspaceDomain.getCurrentWorkspace.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(
                service.getCurrentWorkspace(workspace)
            ).rejects.toThrow(WorkspaceNotFoundException);
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
        });

        it.each([
            ['PolicyForbiddenException', new PolicyForbiddenException()],
            [
                'RequestContextMissingException',
                new RequestContextMissingException(PolicyAbilityStoreKey),
            ],
        ])(
            'propagates %s from authorize after the identity load',
            async (_name, error) => {
                workspaceDomain.getCurrentWorkspace.mockResolvedValue(current);
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.getCurrentWorkspace(workspace)
                ).rejects.toThrow(error);
                expect(
                    workspaceDomain.getCurrentWorkspace
                ).toHaveBeenCalledWith('workspace-id');
            }
        );
    });

    describe('updateWorkspace', () => {
        const dto = {
            name: 'Acme Renamed',
            description: 'Updated description',
        } satisfies WorkspaceUpdateRequestDto;

        it('authorizes update on the workspace and writes', async () => {
            workspaceDomain.updateWorkspace.mockResolvedValue(workspace);

            const result = await service.updateWorkspace(
                workspace,
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: workspace });
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(workspaceDomain.updateWorkspace).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                { name: dto.name, description: dto.description }
            );
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
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.updateWorkspace(workspace, 'actor-id', dto)
                ).rejects.toThrow(error);
                expect(workspaceDomain.updateWorkspace).not.toHaveBeenCalled();
            }
        );
    });

    describe('updateWorkspaceIsPublic', () => {
        const dto = {
            isPublic: true,
        } satisfies WorkspaceUpdateIsPublicRequestDto;

        it('authorizes update on the workspace and writes', async () => {
            workspaceDomain.updateWorkspaceIsPublic.mockResolvedValue(
                workspace
            );

            const result = await service.updateWorkspaceIsPublic(
                workspace,
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: workspace });
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(
                workspaceDomain.updateWorkspaceIsPublic
            ).toHaveBeenCalledWith('workspace-id', 'actor-id', true);
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
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.updateWorkspaceIsPublic(workspace, 'actor-id', dto)
                ).rejects.toThrow(error);
                expect(
                    workspaceDomain.updateWorkspaceIsPublic
                ).not.toHaveBeenCalled();
            }
        );
    });

    describe('updateWorkspaceSlug', () => {
        const dto = {
            slug: 'acme-team',
        } satisfies WorkspaceUpdateSlugRequestDto;

        it('authorizes update on the workspace and writes', async () => {
            workspaceDomain.updateWorkspaceSlug.mockResolvedValue(workspace);

            const result = await service.updateWorkspaceSlug(
                workspace,
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: workspace });
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(workspaceDomain.updateWorkspaceSlug).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                'acme-team'
            );
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
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.updateWorkspaceSlug(workspace, 'actor-id', dto)
                ).rejects.toThrow(error);
                expect(
                    workspaceDomain.updateWorkspaceSlug
                ).not.toHaveBeenCalled();
            }
        );
    });

    describe('switchWorkspace', () => {
        it('delegates to the domain', async () => {
            const dto = {
                workspaceId: 'workspace-id',
            } satisfies WorkspaceSwitchRequestDto;

            await service.switchWorkspace('user-id', dto);

            expect(workspaceDomain.switchWorkspace).toHaveBeenCalledWith(
                'user-id',
                'workspace-id'
            );
        });
    });

    describe('softDeleteWorkspace', () => {
        it('authorizes delete on the workspace and writes', async () => {
            await service.softDeleteWorkspace(workspace, 'actor-id');

            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(workspaceDomain.softDeleteWorkspace).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id'
            );
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
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(
                    service.softDeleteWorkspace(workspace, 'actor-id')
                ).rejects.toThrow(error);
                expect(
                    workspaceDomain.softDeleteWorkspace
                ).not.toHaveBeenCalled();
            }
        );
    });

    describe('getListForAdmin', () => {
        it('merges the isPublic filter into the store patch when provided', async () => {
            const query = {
                isPublic: true,
            } satisfies WorkspaceAdminListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue({
                where: { isPublic: { equals: true } },
                storeFilter: { isPublic: true },
            } as never);
            workspaceDomain.getListForAdmin.mockResolvedValue(offsetPage);
            policyAbilityDomain.scope.mockReturnValue(accessibleWorkspaceWhere);

            const result = await service.getListForAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: { isPublic: true },
                }
            );
            expect(workspaceDomain.getListForAdmin).toHaveBeenCalledWith(
                offsetParams,
                { isPublic: { equals: true } },
                accessibleWorkspaceWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('merges an empty filter set when isPublic is not provided', async () => {
            const query = {} satisfies WorkspaceAdminListRequestDto;
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue(undefined);
            workspaceDomain.getListForAdmin.mockResolvedValue(offsetPage);
            policyAbilityDomain.scope.mockReturnValue(accessibleWorkspaceWhere);

            await service.getListForAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: {},
                }
            );
            expect(workspaceDomain.getListForAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                accessibleWorkspaceWhere
            );
        });

        it('asks the policy domain for the read predicate of the stored ability', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue(undefined);
            workspaceDomain.getListForAdmin.mockResolvedValue(offsetPage);
            policyAbilityDomain.scope.mockReturnValue(accessibleWorkspaceWhere);

            await service.getListForAdmin({});

            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.Workspace
            );
        });

        it('throws RequestContextMissingException when no ability is stored and never lists', async () => {
            policyAbilityDomain.scope.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(service.getListForAdmin({})).rejects.toThrow(
                RequestContextMissingException
            );
            expect(workspaceDomain.getListForAdmin).not.toHaveBeenCalled();
        });

        it('propagates the policy rejection when the ability holds no read rule and never lists', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.equalBoolean.mockReturnValue(undefined);
            policyAbilityDomain.scope.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(service.getListForAdmin({})).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(workspaceDomain.getListForAdmin).not.toHaveBeenCalled();
        });
    });

    describe('getForAdmin', () => {
        it('loads the workspace by id and authorizes read on that row', async () => {
            workspaceDomain.getByIdForAdmin.mockResolvedValue(workspace);

            const result = await service.getForAdmin(workspace.id);

            expect(workspaceDomain.getByIdForAdmin).toHaveBeenCalledWith(
                workspace.id
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                subject(EnumPolicySubject.Workspace, workspace)
            );
            expect(result).toEqual({ data: workspace });
        });

        it('propagates WorkspaceNotFoundException and does not authorize when the load misses', async () => {
            workspaceDomain.getByIdForAdmin.mockRejectedValue(
                new WorkspaceNotFoundException()
            );

            await expect(service.getForAdmin(workspace.id)).rejects.toThrow(
                WorkspaceNotFoundException
            );
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
        });

        it.each([
            ['PolicyForbiddenException', new PolicyForbiddenException()],
            [
                'RequestContextMissingException',
                new RequestContextMissingException(PolicyAbilityStoreKey),
            ],
        ])(
            'propagates %s from authorize after the identity load',
            async (_name, error) => {
                workspaceDomain.getByIdForAdmin.mockResolvedValue(workspace);
                policyAbilityDomain.authorize.mockImplementation(() => {
                    throw error;
                });

                await expect(service.getForAdmin(workspace.id)).rejects.toThrow(
                    error
                );
                expect(workspaceDomain.getByIdForAdmin).toHaveBeenCalledWith(
                    workspace.id
                );
            }
        );
    });

    describe('previewWorkspace', () => {
        it('delegates to the domain and wraps the workspace', async () => {
            workspaceDomain.previewWorkspace.mockResolvedValue(workspace);

            const result = await service.previewWorkspace('acme');

            expect(result).toEqual({ data: workspace });
            expect(workspaceDomain.previewWorkspace).toHaveBeenCalledWith(
                'acme'
            );
        });
    });

    describe('getEffectivePermissions', () => {
        it('wraps the permissions the policy ability domain reports', () => {
            const permissions = [
                { subject: 'Workspace', actions: ['read'] },
            ] as never;
            policyAbilityDomain.getEffectivePermissions.mockReturnValue(
                permissions
            );

            const result = service.getEffectivePermissions(workspace);

            expect(
                policyAbilityDomain.getEffectivePermissions
            ).toHaveBeenCalledWith([
                subject(EnumPolicySubject.Workspace, workspace),
            ]);
            expect(result).toEqual({ data: { permissions } });
        });

        it('throws when the ability is absent from the store', () => {
            policyAbilityDomain.getEffectivePermissions.mockImplementation(
                () => {
                    throw new RequestContextMissingException(
                        PolicyAbilityStoreKey
                    );
                }
            );

            expect(() => service.getEffectivePermissions(workspace)).toThrow(
                RequestContextMissingException
            );
        });
    });
});
