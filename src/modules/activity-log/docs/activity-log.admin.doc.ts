import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { UserDocParamsId } from '@modules/user/constants/user.doc.constant';
import { applyDecorators } from '@nestjs/common';

export function ActivityLogAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity logs',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<ActivityLogResponseDto>('activityLog.list', {
            dto: ActivityLogResponseDto,
        })
    );
}
