import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ActivityListResponseDto } from '@module/activity/dtos/response/activity.list.response.dto';
import { UserDocParamsId } from '@module/user/constants/user.doc.constant';

export function ActivityAdminListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all user activities',
        }),
        DocRequest({
            params: UserDocParamsId,
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ role: true, policy: true }),
        DocResponsePaging<ActivityListResponseDto>('activity.list', {
            dto: ActivityListResponseDto,
        })
    );
}
