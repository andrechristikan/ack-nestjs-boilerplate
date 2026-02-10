import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';
import { Response, ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn, IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected, AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import { EnumPolicyAction, EnumPolicySubject } from '@modules/policy/enums/policy.enum';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectShareRequestDto } from '@modules/project/dtos/request/project.share.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectShareResponseDto } from '@modules/project/dtos/response/project.share.response.dto';
import { ProjectService } from '@modules/project/services/project.service';
import { TenantCurrent, TenantPermissionProtected } from '@modules/tenant/decorators/tenant.decorator';
import { ITenant } from '@modules/tenant/interfaces/tenant.interface';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.shared.project')
@Controller({
    version: '1',
    path: '/tenants/projects',
})
export class ProjectTenantSharedController {
    constructor(private readonly projectService: ProjectService) {}

    @ResponsePaging('project.list')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('')
    async listProjects(
        @TenantCurrent() tenant: ITenant,
        @PaginationOffsetQuery() pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        return this.projectService.getListByTenant(tenant.id, pagination);
    }

    @Response('project.create')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.create],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('')
    async createProject(
        @TenantCurrent() tenant: ITenant,
        @Body() body: ProjectCreateRequestDto,
        @AuthJwtPayload('userId') createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.projectService.create(tenant.id, body, createdBy);
    }

    @Response('project.get')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId')
    async getProject(
        @TenantCurrent() tenant: ITenant,
        @Param('projectId', RequestRequiredPipe) projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectService.getOneByTenant(tenant.id, projectId);
    }

    @Response('project.update')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Patch('/:projectId')
    async updateProject(
        @TenantCurrent() tenant: ITenant,
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @Body() body: ProjectUpdateRequestDto,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectService.updateByTenant(
            tenant.id,
            projectId,
            body,
            updatedBy
        );
    }

    @Response('project.delete')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.delete],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:projectId')
    async deleteProject(
        @TenantCurrent() tenant: ITenant,
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @AuthJwtPayload('userId') updatedBy: string
    ): Promise<IResponseReturn<void>> {
        return this.projectService.deleteByTenant(tenant.id, projectId, updatedBy);
    }

    @Response('project.share.create')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.update],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/:projectId/shares')
    async shareProject(
        @TenantCurrent() tenant: ITenant,
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @Body() body: ProjectShareRequestDto,
        @AuthJwtPayload('userId') sharedBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        return this.projectService.shareProject(
            tenant.id,
            projectId,
            body,
            sharedBy
        );
    }

    @ResponsePaging('project.share.list')
    @TenantPermissionProtected({
        subject: EnumPolicySubject.project,
        action: [EnumPolicyAction.read],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId/shares')
    async listProjectShares(
        @TenantCurrent() tenant: ITenant,
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @PaginationOffsetQuery() pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectShareResponseDto>> {
        return this.projectService.listProjectShares(
            tenant.id,
            projectId,
            pagination
        );
    }
}
