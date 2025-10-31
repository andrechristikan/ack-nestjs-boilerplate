import { ACTIVITY_LOG_METADATA_META_KEY } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { ENUM_ACTIVITY_LOG_ACTION } from '@prisma/client';

/**
 * Decorator that enables activity logging for controller methods.
 * Automatically tracks user actions with optional metadata for audit trail purposes.
 *
 * @param {string} action - The activity action to be logged
 * @param {IActivityLogMetadata} metadata - Optional metadata to include with the activity log
 * @returns {MethodDecorator} Method decorator function
 */
export function ActivityLog(
    action: string,
    metadata?: IActivityLogMetadata
): MethodDecorator {
    return applyDecorators(
        UseInterceptors(ActivityLogInterceptor),
        SetMetadata(ENUM_ACTIVITY_LOG_ACTION, action),
        SetMetadata(ACTIVITY_LOG_METADATA_META_KEY, metadata)
    );
}
