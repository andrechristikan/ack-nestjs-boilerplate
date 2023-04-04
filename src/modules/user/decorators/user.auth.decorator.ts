import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserPayloadPutToRequestGuard } from 'src/modules/user/guards/payload/user.payload.put-to-request.guard';
import { UserNotFoundGuard } from 'src/modules/user/guards/user.not-found.guard';

export function UserAuthProfileGuard(): MethodDecorator {
    return applyDecorators(
        UseGuards(UserPayloadPutToRequestGuard, UserNotFoundGuard)
    );
}
