import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ActivityLogResponseDto } from '@modules/activity-log/dtos/response/activity-log.response.dto';
import { applyDecorators } from '@nestjs/common';

export function ActivityLogSharedListDoc(): MethodDecorator {
    return applyDecorators(
        Doc({
            summary: 'get all activity logs',
        }),
        DocAuth({
            xApiKey: true,
            jwtAccessToken: true,
        }),
        DocGuard({ termPolicy: true }),
        DocResponsePaging<ActivityLogResponseDto>('activityLog.list', {
            dto: ActivityLogResponseDto,
            type: EnumPaginationType.cursor,
        })
    );
}
