import {
    PaginationOffsetQuery,
    PaginationQueryFilterEqualBoolean,
} from '@common/pagination/decorators/pagination.decorator';
import {
    IPaginationEqual,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
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
import { EnumRoleType, Prisma } from '@generated/prisma-client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyAbilityProtected } from '@modules/policy/decorators/policy.decorator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
} from '@modules/workspace/constants/workspace.list.constant';
import {
    WorkspaceAdminGetDoc,
    WorkspaceAdminListDoc,
    WorkspaceAdminMemberListDoc,
} from '@modules/workspace/docs/workspace.admin.doc';
import { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.workspace')
@Controller({
    version: '1',
    path: '/workspace',
})
export class WorkspaceAdminController {
    constructor(private readonly workspaceService: WorkspaceService) {}

    @WorkspaceAdminListDoc()
    @ResponsePaging('workspace.admin.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.workspace,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery({
            availableSearch: WorkspaceDefaultAvailableSearch,
            availableOrderBy: WorkspaceDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceSelect,
            Prisma.WorkspaceWhereInput
        >,
        @PaginationQueryFilterEqualBoolean('isPublic')
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<WorkspaceResponseDto>> {
        return this.workspaceService.getListForAdmin(pagination, isPublic);
    }

    @WorkspaceAdminGetDoc()
    @Response('workspace.admin.get')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.workspace,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:workspaceId')
    async get(
        @Param('workspaceId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        workspaceId: string
    ): Promise<IResponseReturn<WorkspaceResponseDto>> {
        return this.workspaceService.getByIdForAdmin(workspaceId);
    }

    @WorkspaceAdminMemberListDoc()
    @ResponsePaging('workspace.admin.member.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.workspace,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:workspaceId/members')
    async membersList(
        @Param('workspaceId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        workspaceId: string,
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.WorkspaceMemberSelect,
            Prisma.WorkspaceMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<WorkspaceMemberResponseDto>> {
        return this.workspaceService.getMembersListForAdmin(
            workspaceId,
            pagination
        );
    }
}
