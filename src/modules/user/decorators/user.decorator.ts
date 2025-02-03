import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/modules/user/guards/user.guard';

export function UserProtected(): MethodDecorator {
    return applyDecorators(UseGuards(UserGuard));
}
