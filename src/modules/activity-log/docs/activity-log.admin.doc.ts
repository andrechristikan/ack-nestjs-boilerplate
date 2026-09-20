import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponsePagination,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogResponseSchema } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import type { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { applyDecorators } from '@nestjs/common';

export function ActivityLogAdminListByUserDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity logs of a user',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<ActivityLogResponseDto>(
            'activityLog.listByUser',
            {
                schema: ActivityLogResponseSchema,
                availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}

export function ActivityLogAdminListByWorkspaceDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity logs of a workspace',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ user: true, role: true, policy: true, termPolicy: true }),
        DocResponsePagination<ActivityLogResponseDto>(
            'activityLog.listByWorkspace',
            {
                schema: ActivityLogResponseSchema,
                availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}
