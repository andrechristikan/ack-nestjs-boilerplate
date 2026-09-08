import {
    Doc,
    DocAuth,
    DocGuard,
    DocOneOf,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    ActivityLogResponseDto,
    ActivityLogResponseSchema,
} from '@modules/activity-log/dtos/response/activity-log.response.dto';
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
        DocResponsePaging<ActivityLogResponseDto>('activityLog.listSelf', {
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
        DocOneOf(HttpStatus.NOT_FOUND, {
            statusCode: EnumWorkspaceStatusCodeError.notFound,
            messagePath: 'workspace.error.notFound',
        }),
        DocOneOf(HttpStatus.FORBIDDEN, {
            statusCode: EnumWorkspaceStatusCodeError.memberForbidden,
            messagePath: 'workspace.error.memberForbidden',
        }),
        DocResponsePaging<ActivityLogResponseDto>(
            'activityLog.listSelfByWorkspace',
            {
                schema: ActivityLogResponseSchema,
                availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                type: EnumPaginationType.cursor,
            }
        )
    );
}
