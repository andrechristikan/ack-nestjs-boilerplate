import { ActivityLogActionMetaKey } from '@modules/activity-log/constants/activity-log.constant';
import { ActivityLogInterceptor } from '@modules/activity-log/interceptors/activity-log.interceptor';
import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { EnumActivityLogAction } from '@generated/prisma-client';

/**
 * Method decorator that enables activity logging for a controller method.
 * Attaches `ActivityLogInterceptor` and stores the action and optional static metadata via `SetMetadata`.
 * Dynamic metadata is captured from the per-request activity-log context (set via `RequestStoreService.merge` under `ActivityLogMetadataStoreKey`), not from the response object.
 * Requires `@AuthJwtAccessProtected()` to be present so that `request.user` is populated before the interceptor runs.
 *
 * @param {EnumActivityLogAction} action - The activity action enum value to be recorded
 * @param {IActivityLogMetadata} [metadata] - Static metadata set at decoration time; merged with dynamic metadata from the activity-log context
 * @returns {MethodDecorator} Combined method decorator applying the interceptor and metadata
 */
export function ActivityLog(action: EnumActivityLogAction): MethodDecorator {
    return applyDecorators(
        UseInterceptors(ActivityLogInterceptor),
        SetMetadata(ActivityLogActionMetaKey, action)
    );
}
