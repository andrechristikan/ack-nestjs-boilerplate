import { PaginationOffsetQuery } from '@common/pagination/decorators/pagination.decorator';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Response, ResponsePaging } from '@common/response/decorators/response.decorator';
import { IResponsePagingReturn, IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected, AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import { UserProtected } from '@modules/user/decorators/user.decorator';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequestRequiredPipe } from '@common/request/pipes/request.required.pipe';

@ApiTags('modules.shared.project')
@Controller({
    version: '1',
    path: '/projects',
})
export class ProjectSharedController {
    constructor(private readonly projectMemberService: ProjectMemberService) {}

    @ResponsePaging('project.shared.list')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('')
    async list(
        @AuthJwtPayload('userId') userId: string,
        @PaginationOffsetQuery() pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectAccessResponseDto>> {
        return this.projectMemberService.list(userId, pagination);
    }

    @Response('project.shared.get')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:projectId')
    async get(
        @Param('projectId', RequestRequiredPipe) projectId: string,
        @AuthJwtPayload('userId') userId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        return this.projectMemberService.getOne(projectId, userId);
    }
}
