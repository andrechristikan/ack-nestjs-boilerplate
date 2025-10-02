import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ActivityLogDocQueryList } from '@modules/activity-log/constants/activity-log.doc.constant';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { applyDecorators } from '@nestjs/common';

export function ActivityLogAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity logs',
        }),
        DocRequest({
            queries: ActivityLogDocQueryList,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ActivityLogResponseDto>('activityLog.list', {
            dto: ActivityLogResponseDto,
        })
    );
}
