import { ActivityLogActionMetaKey } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { EnumActivityLogAction } from '@generated/prisma-client';

/**
 * Logs the given action for the request. Requires `@AuthJwtAccessProtected` so `request.user` is set before the interceptor runs.
 */
export function ActivityLog(action: EnumActivityLogAction): MethodDecorator {
    return applyDecorators(
        UseInterceptors(ActivityLogInterceptor),
        SetMetadata(ActivityLogActionMetaKey, action)
    );
}
