import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
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
import {
    ProjectAdminGetDoc,
    ProjectAdminListDoc,
} from '@modules/project/docs/project.admin.doc';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { RoleProtected } from '@modules/role/decorators/role.decorator';
import { TermPolicyAcceptanceProtected } from '@modules/term-policy/decorators/term-policy.decorator';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.admin.project')
@Controller({
    version: '1',
    path: '/project',
})
export class ProjectAdminController {
    constructor(private readonly projectService: ProjectService) {}

    @ProjectAdminListDoc()
    @ResponsePaging('project.admin.list')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/list')
    async list(
        @PaginationOffsetQuery()
        pagination: IPaginationQueryOffsetParams<
            Prisma.ProjectSelect,
            Prisma.ProjectWhereInput
        >,
        @Query('workspaceId', new RequestIsValidObjectIdPipe({ optional: true }))
        workspaceId?: string
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        return this.projectService.getListForAdmin(pagination, workspaceId);
    }

    @ProjectAdminGetDoc()
    @Response('project.admin.get')
    @TermPolicyAcceptanceProtected()
    @PolicyAbilityProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:projectId')
    async get(
        @Param('projectId', RequestRequiredPipe, RequestIsValidObjectIdPipe)
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.getByIdForAdmin(projectId);
    }
}
