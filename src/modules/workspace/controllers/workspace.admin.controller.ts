import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualBoolean,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationEqual,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.throttler.decorator';
import { RequestIsValidObjectIdPipe } from '@common/request/pipes/request.is-valid-object-id.pipe';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
    Workspace,
} from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceMemberDefaultAvailableOrderBy,
} from '@modules/workspace/constants/workspace.list.constant';
import {
    WorkspaceAdminGetDoc,
    WorkspaceAdminListDoc,
    WorkspaceAdminMemberListDoc,
} from '@modules/workspace/docs/workspace.admin.doc';
import { WorkspaceMemberResponseSchema } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';
import { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceHttpService } from '@modules/workspace/services/workspace.http.service';
import { WorkspaceMemberHttpService } from '@modules/workspace/services/workspace.member.http.service';
import { Controller, Get, Param } from '@nestjs/common';
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

    @WorkspaceAdminListDoc()
    @ResponsePaging('workspace.admin.list', {
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
        @PaginationOffsetQuery({
            availableSearch: WorkspaceDefaultAvailableSearch,
            availableOrderBy: WorkspaceDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        @PaginationQueryFilterEqualBoolean('isPublic')
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<Workspace>> {
        return this.workspaceHttpService.getListForAdmin(pagination, isPublic);
    }

    @WorkspaceAdminGetDoc()
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
        @Param('workspaceId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        workspaceId: string
    ): Promise<IResponseReturn<Workspace>> {
        return this.workspaceHttpService.getByIdForAdmin(workspaceId);
    }

    @WorkspaceAdminMemberListDoc()
    @ResponsePaging('workspace.admin.member.list', {
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
        @Param('workspaceId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        workspaceId: string,
        @PaginationOffsetQuery({
            availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>> {
        return this.workspaceMemberHttpService.getMembersListForAdmin(
            workspaceId,
            pagination
        );
    }
}
