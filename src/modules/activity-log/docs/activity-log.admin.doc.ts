import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ActivityLogDocQueryListByWorkspace } from '@modules/activity-log/constants/activity-log.doc.constant';
import { ActivityLogDefaultAvailableOrderBy } from '@modules/activity-log/constants/activity-log.list.constant';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { UserDocParamsId } from '@modules/user/constants/user.doc.constant';
import { WorkspaceDocParamsId } from '@modules/workspace/constants/workspace.doc.constant';
import { applyDecorators } from '@nestjs/common';

export function ActivityLogAdminListByUserDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity logs of a user',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<ActivityLogResponseDto>('activityLog.listByUser', {
            dto: ActivityLogResponseDto,
            availableOrderBy: ActivityLogDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

export function ActivityLogAdminListByWorkspaceDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity logs of a workspace',
        }),
        DocRequest({
            params: WorkspaceDocParamsId,
            queries: ActivityLogDocQueryListByWorkspace,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<ActivityLogResponseDto>(
            'activityLog.listByWorkspace',
            {
                dto: ActivityLogResponseDto,
                availableOrderBy: ActivityLogDefaultAvailableOrderBy,
                type: EnumPaginationType.offset,
            }
        )
    );
}
