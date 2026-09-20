import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceMemberDefaultAvailableOrderBy,
} from '@modules/workspace/constants/workspace.list.constant';
import { WorkspaceDocQueryList } from '@modules/workspace/constants/workspace.doc.constant';
import { WorkspaceMemberResponseSchema } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import type { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseSchema } from '@modules/workspace/dtos/response/workspace.response.dto';
import type { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';
import { applyDecorators } from '@nestjs/common';

export function WorkspaceAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin list all workspaces (read-only)' }),
        DocRequest({ queries: WorkspaceDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, user: true, policy: true, termPolicy: true }),
        DocResponsePagination<WorkspaceResponseDto>('workspace.admin.list', {
            schema: WorkspaceResponseSchema,
            type: EnumPaginationType.offset,
            availableSearch: WorkspaceDefaultAvailableSearch,
            availableOrderBy: WorkspaceDefaultAvailableOrderBy,
        })
    );
}

export function WorkspaceAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary:
                'admin get a workspace by id (read-only, includes soft-deleted)',
        }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, user: true, policy: true, termPolicy: true }),
        DocResponse<WorkspaceResponseDto>('workspace.admin.get', {
            schema: WorkspaceResponseSchema,
        })
    );
}

export function WorkspaceAdminMemberListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin list members of a workspace (read-only)' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, user: true, policy: true, termPolicy: true }),
        DocResponsePagination<WorkspaceMemberResponseDto>(
            'workspace.admin.member.list',
            {
                schema: WorkspaceMemberResponseSchema,
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}
