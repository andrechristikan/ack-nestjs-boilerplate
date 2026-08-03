import { UseGuards, applyDecorators } from '@nestjs/common';
import { RequestThrottleByUserGuard } from '@common/request/guards/request.throttle-by-user.guard';

export function RequestThrottleByUser(): MethodDecorator {
    return applyDecorators(UseGuards(RequestThrottleByUserGuard));
}
