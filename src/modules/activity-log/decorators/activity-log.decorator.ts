import { ActivityLogMetadataMetaKey } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { EnumActivityLogAction } from '@prisma/client';

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
    // TODO: 2 implement bidirectional logging support, and record when failed attempts occur
    return applyDecorators(
        UseInterceptors(ActivityLogInterceptor),
        SetMetadata(EnumActivityLogAction, action),
        SetMetadata(ActivityLogMetadataMetaKey, metadata)
    );
}
