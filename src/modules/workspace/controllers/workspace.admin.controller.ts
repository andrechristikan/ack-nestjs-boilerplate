import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import { WorkspaceAdminMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { WorkspaceAdminListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePagination,
} from '@common/response/decorators/response.decorator';

import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';

import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';

import type { Workspace } from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';

import { WorkspaceMemberResponseSchema } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';
import { Controller, Get, Param, Query } from '@nestjs/common';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspaceAdminController {
    constructor(
        private readonly workspaceHttpService: WorkspaceHttpService,
        private readonly workspaceMemberHttpService: WorkspaceMemberHttpService
    ) {}

    @Doc({ summary: 'admin list all workspaces (read-only)' })
    @ResponsePagination('workspace.admin.list', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.workspace,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/list')
    async list(
        @Query({ schema: WorkspaceAdminListRequestSchema })
        query: WorkspaceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceHttpService.getListForAdmin(query);
    }

    @Doc({
        summary:
            'admin get a workspace by id (read-only, includes soft-deleted)',
    })
    @Response('workspace.admin.get', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.workspace,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:workspaceId')
    async get(
        @Param('workspaceId', { schema: RequestUuidSchema })
        workspaceId: string
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.getByIdForAdmin(workspaceId);
    }

    @Doc({ summary: 'admin list members of a workspace (read-only)' })
    @ResponsePagination('workspace.admin.member.list', {
        schema: WorkspaceMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.workspace,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:workspaceId/members')
    async membersList(
        @Query({ schema: WorkspaceAdminMemberListRequestSchema })
        query: WorkspaceAdminMemberListRequestDto,
        @Param('workspaceId', { schema: RequestUuidSchema })
        workspaceId: string
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceMemberHttpService.getMembersListForAdmin(
            workspaceId,
            query
        );
    }
}
