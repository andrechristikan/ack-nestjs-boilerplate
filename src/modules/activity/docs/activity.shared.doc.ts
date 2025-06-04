import { applyDecorators } from '@nestjs/common';
import {
    Doc,
    DocAuth,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { ActivityListResponseDto } from '@module/activity/dtos/response/activity.list.response.dto';

export function ActivitySharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity user itself',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocResponsePaging<ActivityListResponseDto>('activity.list', {
            dto: ActivityListResponseDto,
        })
    );
}
