import {
    Doc,
    DocAuth,
    DocGuard,
    DocOneOf,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    ProjectAdminListDocQueries,
    ProjectDocParamsId,
} from '@modules/project/constants/project.doc.constant';
import {
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import {
    ProjectResponseDto,
    ProjectResponseSchema,
} from '@modules/project/dtos/response/project.response.dto';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function ProjectAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin list all projects (read-only); optional workspaceId filter',
        }),
        DocRequest({ queries: ProjectAdminListDocQueries }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocResponsePaging<ProjectResponseDto>('project.admin.list', {
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
        DocRequest({ params: ProjectDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumProjectStatusCodeError.notFound,
            messagePath: 'project.error.notFound',
        }),
        DocResponse<ProjectResponseDto>('project.admin.get', {
            schema: ProjectResponseSchema,
        })
    );
}
