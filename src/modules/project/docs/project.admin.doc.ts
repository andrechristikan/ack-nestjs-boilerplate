import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import { ProjectResponseSchema } from '@modules/project/dtos/response/project.response.dto';
import type { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { applyDecorators } from '@nestjs/common';

export function ProjectAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin list all projects (read-only); optional workspaceId filter',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, user: true, policy: true, termPolicy: true }),
        DocResponsePagination<ProjectResponseDto>('project.admin.list', {
            schema: ProjectResponseSchema,
            availableSearch: ProjectDefaultAvailableSearch,
            availableOrderBy: ProjectDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

export function ProjectAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin get a project by id (read-only, includes soft-deleted)',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, user: true, policy: true, termPolicy: true }),
        DocResponse<ProjectResponseDto>('project.admin.get', {
            schema: ProjectResponseSchema,
        })
    );
}
