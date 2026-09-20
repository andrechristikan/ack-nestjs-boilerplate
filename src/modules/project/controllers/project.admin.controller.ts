import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import { ProjectAdminListRequestSchema } from '@modules/project/dtos/request/project.admin-list.request.dto';
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

import type { Project } from '@generated/prisma-client/client';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@modules/auth/decorators/auth.jwt.decorator';
import { PolicyProtected } from '@modules/policy/decorators/policy.decorator';

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

    @Doc({
        summary:
            'admin list all projects (read-only); optional workspaceId filter',
    })
    @ResponsePagination('project.admin.list', {
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
        @Query({ schema: ProjectAdminListRequestSchema })
        query: ProjectAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        return this.projectHttpService.getListForAdmin(query);
    }

    @Doc({
        summary: 'admin get a project by id (read-only, includes soft-deleted)',
    })
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
