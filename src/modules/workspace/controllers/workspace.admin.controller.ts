import type { IPolicyContext } from '@modules/policy/interfaces/policy.interface';
import type { WorkspaceAdminMemberListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import { WorkspaceAdminMemberListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-member-list.request.dto';
import type { WorkspaceAdminListRequestDto } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { WorkspaceAdminListRequestSchema } from '@modules/workspace/dtos/request/workspace.admin-list.request.dto';
import { WorkspaceTransferOwnershipRequestSchema } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import type { WorkspaceTransferOwnershipRequestDto } from '@modules/workspace/dtos/request/workspace.transfer-ownership.request.dto';
import { Doc } from '@common/doc/decorators/doc.decorator';
import {
    RequestContext,
    RequestThrottle,
} from '@common/request/decorators/request.decorator';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
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
} from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import {
    ApiKeyContext,
    ApiKeyProtected,
} from '@modules/api-key/decorators/api-key.decorator';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import {
    AuthJwtAccessContext,
    AuthJwtAccessProtected,
} from '@modules/auth/decorators/auth.jwt.decorator';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';
import {
    PolicyContext,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { WorkspaceMemberResponseSchema } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceGetListOffsetByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-list-offset-by-admin.use-case';
import { WorkspaceGetByIdByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-by-id-by-admin.use-case';
import { WorkspaceGetMembersListByAdminUseCase } from '@modules/workspace/use-cases/workspace.get-members-list-by-admin.use-case';
import { WorkspaceTransferOwnershipByAdminUseCase } from '@modules/workspace/use-cases/workspace.transfer-ownership-by-admin.use-case';
import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspaceAdminController {
    constructor(
        private readonly workspaceGetListOffsetByAdminUseCase: WorkspaceGetListOffsetByAdminUseCase,
        private readonly workspaceGetByIdByAdminUseCase: WorkspaceGetByIdByAdminUseCase,
        private readonly workspaceGetMembersListByAdminUseCase: WorkspaceGetMembersListByAdminUseCase,
        private readonly workspaceTransferOwnershipByAdminUseCase: WorkspaceTransferOwnershipByAdminUseCase
    ) {}

    @Doc({ summary: 'admin list all workspaces (read-only)' })
    @ResponsePagination('workspace.admin.list', {
        schema: WorkspaceResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PolicyContext() policyContext: IPolicyContext,
        @Query({ schema: WorkspaceAdminListRequestSchema })
        query: WorkspaceAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceGetListOffsetByAdminUseCase.execute(
            policyContext,
            query
        );
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
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:workspaceId')
    async get(
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceId', { schema: RequestUuidSchema })
        workspaceId: string
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceGetByIdByAdminUseCase.execute(
            policyContext,
            workspaceId
        );
    }

    @Doc({ summary: 'admin list members of a workspace (read-only)' })
    @ResponsePagination('workspace.admin.member.list', {
        schema: WorkspaceMemberResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/member/:workspaceId/list')
    async memberList(
        @PolicyContext() policyContext: IPolicyContext,
        @Param('workspaceId', { schema: RequestUuidSchema })
        workspaceId: string,
        @Query({ schema: WorkspaceAdminMemberListRequestSchema })
        query: WorkspaceAdminMemberListRequestDto
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceGetMembersListByAdminUseCase.execute(
            policyContext,
            workspaceId,
            query
        );
    }

    @Doc({ summary: 'admin transfer workspace ownership to an active member' })
    @Response('workspace.admin.transferOwnership')
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.Workspace,
        action: [EnumPolicyAction.update],
    })
    @UserProtected()
    @RequestThrottle({ user: true })
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/ownership/:workspaceId/transfer')
    async transferOwnership(
        @RequestContext() requestContext: IRequestContext,
        @ApiKeyContext() apiKeyContext: IApiKeyContext,
        @AuthJwtAccessContext() authContext: IAuthJwtAccessContext,
        @Param('workspaceId', { schema: RequestUuidSchema })
        workspaceId: string,
        @Body({ schema: WorkspaceTransferOwnershipRequestSchema })
        body: WorkspaceTransferOwnershipRequestDto
    ): Promise<IResponseReturn<void>> {
        return this.workspaceTransferOwnershipByAdminUseCase.execute(
            requestContext,
            apiKeyContext,
            authContext,
            workspaceId,
            body
        );
    }
}
