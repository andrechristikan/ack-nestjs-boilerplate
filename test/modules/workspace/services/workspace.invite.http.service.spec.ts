import { subject } from '@casl/ability';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
    EnumWorkspaceInviteStatus,
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { EnumWorkspaceInviteExpiry } from '@modules/workspace/enums/workspace.enum';
import type { WorkspaceInviteClaimRequestDto } from '@modules/workspace/dtos/request/workspace.invite-claim.request.dto';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import type { WorkspaceInviteListRequestDto } from '@modules/workspace/dtos/request/workspace.invite-list.request.dto';
import type { WorkspaceInviteResendRequestDto } from '@modules/workspace/dtos/request/workspace.invite-resend.request.dto';
import type { WorkspaceInviteResponseDto } from '@modules/workspace/dtos/response/workspace.invite.response.dto';
import type { WorkspaceInvitePreviewResponseDto } from '@modules/workspace/dtos/response/workspace.invite-preview.response.dto';
import type {
    IWorkspaceInviteList,
    IWorkspaceInviteWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceInviteHttpService } from '@modules/workspace/services/workspace.invite.http.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';

describe('WorkspaceInviteHttpService', () => {
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const accessibleWhere = { workspaceId: 'workspace-id' };
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiredAt = new Date('2026-02-01T00:00:00.000Z');
    const workspace = {
        id: 'workspace-id',
        name: 'Acme',
        slug: 'acme',
        description: null,
        isPublic: false,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    } satisfies Workspace;
    const workspaceRole = {
        id: 'workspace-role-id',
        scope: EnumRoleScope.workspace,
        key: EnumRoleWorkspaceKey.member,
        name: 'Member',
    };
    const projectRole = {
        id: 'project-role-id',
        scope: EnumRoleScope.project,
        key: EnumRoleProjectKey.viewer,
        name: 'Viewer',
    };
    const invite = {
        id: 'invite-id',
        workspaceId: 'workspace-id',
        email: 'invitee@example.com',
        workspaceRoleId: workspaceRole.id,
        workspaceRole,
        projectId: null,
        projectRoleId: null,
        projectRole: null,
        token: 'token',
        reference: 'reference',
        expiredAt,
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'inviter-id',
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: now,
        createdBy: 'inviter-id',
        updatedAt: now,
        updatedBy: 'inviter-id',
    } satisfies IWorkspaceInviteWithRole;
    const inviteResponse: WorkspaceInviteResponseDto = {
        id: invite.id,
        workspaceId: invite.workspaceId,
        email: invite.email,
        workspaceRole: invite.workspaceRole,
        projectId: invite.projectId,
        projectRole: invite.projectRole,
        reference: invite.reference,
        expiredAt: invite.expiredAt,
        status: invite.status,
        invitedByUserId: invite.invitedByUserId,
        acceptedAt: invite.acceptedAt,
        acceptedByUserId: invite.acceptedByUserId,
        createdAt: invite.createdAt,
        createdBy: invite.createdBy,
        updatedAt: invite.updatedAt,
        updatedBy: invite.updatedBy,
    };
    const inviteListItem = {
        id: 'invite-id',
        workspaceId: 'workspace-id',
        email: 'invitee@example.com',
        workspaceRole,
        projectId: null,
        projectRole: null,
        reference: 'reference',
        expiredAt,
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'inviter-id',
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: now,
        createdBy: 'inviter-id',
        updatedAt: now,
        updatedBy: 'inviter-id',
    } satisfies IWorkspaceInviteList;
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [inviteListItem],
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
        availableSearch: ['email', 'reference'],
        availableOrderBy: ['createdAt'],
    };

    let service: WorkspaceInviteHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.accessibleWhere.mockReturnValue(accessibleWhere);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceInviteHttpService,
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
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

        service = module.get(WorkspaceInviteHttpService);
    });

    describe('getInvitesList', () => {
        it('merges the status filter into the store patch when a status is provided', async () => {
            const query = {
                status: 'pending',
            } satisfies WorkspaceInviteListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { status: { in: ['pending'] } },
                storeFilter: { status: ['pending'] },
            } as never);
            workspaceInviteDomain.getInvitesList.mockResolvedValue(cursorPage);

            const result = await service.getInvitesList('workspace-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: { status: ['pending'] },
                }
            );
            expect(workspaceInviteDomain.getInvitesList).toHaveBeenCalledWith(
                'workspace-id',
                cursorParams,
                { status: { in: ['pending'] } },
                accessibleWhere
            );
            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceInvite
            );
            expect(result).toEqual(cursorPage);
        });

        it('merges an empty filter set when no status is provided', async () => {
            const query = {} satisfies WorkspaceInviteListRequestDto;
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            workspaceInviteDomain.getInvitesList.mockResolvedValue(cursorPage);

            await service.getInvitesList('workspace-id', query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...cursorStorePatch,
                    filters: {},
                }
            );
            expect(workspaceInviteDomain.getInvitesList).toHaveBeenCalledWith(
                'workspace-id',
                cursorParams,
                undefined,
                accessibleWhere
            );
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.getInvitesList('workspace-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceInviteDomain.getInvitesList).not.toHaveBeenCalled();
        });
    });

    describe('createInvite', () => {
        it('delegates to the domain and returns the invite the util maps', async () => {
            const dto = {
                email: 'invitee@example.com',
                workspaceRoleId: workspaceRole.id,
                projectId: 'project-id',
                projectRoleId: projectRole.id,
                expiryDuration: EnumWorkspaceInviteExpiry.sevenDays,
            } satisfies WorkspaceInviteCreateRequestDto;
            workspaceInviteDomain.createInvite.mockResolvedValue(invite);
            workspaceUtil.mapInvite.mockReturnValue(inviteResponse);

            const result = await service.createInvite(
                workspace,
                'actor-id',
                dto
            );

            expect(result).toEqual({ data: inviteResponse });
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.create,
                subject(EnumPolicySubject.WorkspaceInvite, {
                    workspaceId: workspace.id,
                })
            );
            expect(workspaceUtil.mapInvite).toHaveBeenCalledWith(invite);
            expect(workspaceInviteDomain.createInvite).toHaveBeenCalledWith(
                workspace,
                'actor-id',
                {
                    email: dto.email,
                    workspaceRoleId: dto.workspaceRoleId,
                    projectId: dto.projectId,
                    projectRoleId: dto.projectRoleId,
                    expiryDuration: dto.expiryDuration,
                }
            );
        });
    });

    describe('createInvite policy denial', () => {
        it('does not call the domain when the policy denies the invite', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.createInvite(workspace, 'actor-id', {
                    email: 'invitee@example.com',
                    workspaceRoleId: workspaceRole.id,
                } as WorkspaceInviteCreateRequestDto)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceInviteDomain.createInvite).not.toHaveBeenCalled();
        });
    });

    describe('resendInvite', () => {
        it('delegates to the domain and returns the invite the util maps', async () => {
            const dto = {
                expiryDuration: EnumWorkspaceInviteExpiry.sevenDays,
            } satisfies WorkspaceInviteResendRequestDto;
            workspaceInviteDomain.getInvite.mockResolvedValue(invite);
            workspaceInviteDomain.resendInvite.mockResolvedValue(invite);
            workspaceUtil.mapInvite.mockReturnValue(inviteResponse);

            const result = await service.resendInvite(
                workspace,
                'actor-id',
                'invite-id',
                dto
            );

            expect(result).toEqual({ data: inviteResponse });
            expect(workspaceInviteDomain.getInvite).toHaveBeenCalledWith(
                'workspace-id',
                'invite-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.WorkspaceInvite, invite)
            );
            expect(workspaceUtil.mapInvite).toHaveBeenCalledWith(invite);
            expect(workspaceInviteDomain.resendInvite).toHaveBeenCalledWith(
                workspace,
                'actor-id',
                'invite-id',
                dto.expiryDuration
            );
        });
    });

    describe('resendInvite policy denial', () => {
        it('does not call the domain when the policy denies the invite', async () => {
            workspaceInviteDomain.getInvite.mockResolvedValue(invite);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.resendInvite(workspace, 'actor-id', 'invite-id', {})
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceInviteDomain.resendInvite).not.toHaveBeenCalled();
        });
    });

    describe('revokeInvite policy denial', () => {
        it('does not call the domain when the policy denies the invite', async () => {
            workspaceInviteDomain.getInvite.mockResolvedValue(invite);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.revokeInvite('workspace-id', 'actor-id', 'invite-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(workspaceInviteDomain.revokeInvite).not.toHaveBeenCalled();
        });
    });

    describe('revokeInvite', () => {
        it('checks WorkspaceInvite delete on the loaded invite, then delegates to the domain', async () => {
            workspaceInviteDomain.getInvite.mockResolvedValue(invite);
            await service.revokeInvite('workspace-id', 'actor-id', 'invite-id');

            expect(workspaceInviteDomain.getInvite).toHaveBeenCalledWith(
                'workspace-id',
                'invite-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.WorkspaceInvite, invite)
            );

            expect(workspaceInviteDomain.revokeInvite).toHaveBeenCalledWith(
                'workspace-id',
                'actor-id',
                'invite-id'
            );
        });
    });

    describe('claimInvite', () => {
        it('delegates to the domain', async () => {
            const dto = {
                inviteToken: 'invite-token',
            } satisfies WorkspaceInviteClaimRequestDto;

            await service.claimInvite('user-id', 'user@example.com', dto);

            expect(workspaceInviteDomain.claimInvite).toHaveBeenCalledWith(
                'user-id',
                'user@example.com',
                'invite-token'
            );
        });
    });

    describe('previewInvite', () => {
        it('maps the domain preview and wraps it in the response envelope', async () => {
            const inviter = { name: 'Inviter', username: 'inviter' };
            const preview = {
                workspaceName: workspace.name,
                inviterName: inviter.name,
                workspaceRole: invite.workspaceRole,
                expiredAt: invite.expiredAt,
            } satisfies WorkspaceInvitePreviewResponseDto;
            workspaceInviteDomain.previewInvite.mockResolvedValue({
                workspace,
                invite,
                inviter,
            });
            workspaceUtil.mapInvitePreview.mockReturnValue(preview);

            const result = await service.previewInvite('invite-token');

            expect(workspaceInviteDomain.previewInvite).toHaveBeenCalledWith(
                'invite-token'
            );
            expect(workspaceUtil.mapInvitePreview).toHaveBeenCalledWith(
                workspace,
                invite,
                inviter
            );
            expect(result).toEqual({ data: preview });
        });
    });
});
