import { SetMetadata, UseInterceptors, applyDecorators } from '@nestjs/common';
import { RequestThrottleOptionsMetaKey } from '@common/request/constants/request.constant';
import { RequestThrottleInterceptor } from '@common/request/interceptors/request.throttle.interceptor';
import { IRequestThrottleOptions } from '@common/request/interfaces/request.interface';

/**
 * Switches on the `route` and `user` throttle limiters for one endpoint.
 */
export function RequestThrottle(
    options: IRequestThrottleOptions
): MethodDecorator {
    return applyDecorators(
        SetMetadata(RequestThrottleOptionsMetaKey, options),
        UseInterceptors(RequestThrottleInterceptor)
    );
}
