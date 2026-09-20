import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestThrottle } from '@common/request/decorators/request.decorator';
import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';
import {
    Response,
    ResponsePaging,
} from '@common/response/decorators/response.decorator';
import type {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';
import {
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import {
    ProjectAdminGetDoc,
    ProjectAdminListDoc,
} from '@modules/project/docs/project.admin.doc';
import { ProjectResponseSchema } from '@modules/project/dtos/response/project.response.dto';
import { ProjectHttpService } from '@modules/project/services/project.http.service';
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
    constructor(private readonly projectHttpService: ProjectHttpService) {}

    @ProjectAdminListDoc()
    @ResponsePaging('project.admin.list', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.project,
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
            availableSearch: ProjectDefaultAvailableSearch,
            availableOrderBy: ProjectDefaultAvailableOrderBy,
        })
        pagination: IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>,
        @Query('workspaceId', { schema: RequestUuidSchema.optional() })
        workspaceId?: string
    ): Promise<IResponsePagingReturn<Project>> {
        return this.projectHttpService.getListForAdmin(pagination, workspaceId);
    }

    @ProjectAdminGetDoc()
    @Response('project.admin.get', {
        schema: ProjectResponseSchema,
    })
    @TermPolicyAcceptanceProtected()
    @PolicyProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.read],
    })
    @RoleProtected(EnumRoleType.admin)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @RequestThrottle({ user: true })
    @Get('/get/:projectId')
    async get(
        @Param('projectId', { schema: RequestUuidSchema })
        projectId: string
    ): Promise<IResponseReturn<Project>> {
        return this.projectHttpService.getByIdForAdmin(projectId);
    }
}
