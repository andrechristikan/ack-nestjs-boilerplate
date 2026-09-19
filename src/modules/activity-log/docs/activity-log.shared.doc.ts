import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponseError,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ActivityLogResponseSchema } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import type { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { HttpStatus, applyDecorators } from '@nestjs/common';

export function ActivityLogSharedListSelfDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get my own activity logs',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponsePagination<ActivityLogResponseDto>('activityLog.listSelf', {
            schema: ActivityLogResponseSchema,
            availableOrderBy: ActivityLogDefaultAvailableOrderBy,
            type: EnumPaginationType.cursor,
        })
    );
}

export function ActivityLogSharedListSelfByWorkspaceDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get my own activity logs in the current workspace',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponseError(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.notFound,
            messagePath: 'workspace.error.notFound',
        }),
        DocResponseError(HttpStatus.FORBIDDEN, {
            statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
            messagePath: 'workspace.error.memberForbidden',
        }),
        DocResponsePagination<ActivityLogResponseDto>(
            'activityLog.listSelfByWorkspace',
            {
                schema: ActivityLogResponseSchema,
                availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                type: EnumPaginationType.cursor,
            }
        )
    );
}
