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
    WorkspaceDocParamsId,
    WorkspaceDocQueryList,
} from '@modules/workspace/constants/workspace.doc.constant';
import {
    WorkspaceDefaultAvailableOrderBy,
    WorkspaceDefaultAvailableSearch,
    WorkspaceMemberDefaultAvailableOrderBy,
} from '@modules/workspace/constants/workspace.list.constant';
import { WorkspaceMemberResponseDto } from '@modules/workspace/dtos/response/workspace.member.response.dto';
import { WorkspaceResponseDto } from '@modules/workspace/dtos/response/workspace.response.dto';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function WorkspaceAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin list all workspaces (read-only)' }),
        DocRequest({ queries: WorkspaceDocQueryList }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocResponsePaging<WorkspaceResponseDto>('workspace.admin.list', {
            dto: WorkspaceResponseDto,
            type: EnumPaginationType.offset,
            availableSearch: WorkspaceDefaultAvailableSearch,
            availableOrderBy: WorkspaceDefaultAvailableOrderBy,
        })
    );
}

export function WorkspaceAdminGetDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin get a workspace by id (read-only, includes soft-deleted)' }),
        DocRequest({ params: WorkspaceDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.notFound,
            messagePath: 'workspace.error.notFound',
        }),
        DocResponse<WorkspaceResponseDto>('workspace.admin.get', {
            dto: WorkspaceResponseDto,
        })
    );
}

export function WorkspaceAdminMemberListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'admin list members of a workspace (read-only)' }),
        DocRequest({ params: WorkspaceDocParamsId }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true }),
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.notFound,
            messagePath: 'workspace.error.notFound',
        }),
        DocResponsePaging<WorkspaceMemberResponseDto>(
            'workspace.admin.member.list',
            {
                dto: WorkspaceMemberResponseDto,
                availableOrderBy: WorkspaceMemberDefaultAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}
