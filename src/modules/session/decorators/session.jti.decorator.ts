import { applyDecorators, UseGuards } from '@nestjs/common';
import { SessionJtiGuard } from '@modules/session/guards/session.jti.guard';

export function SessionJtiProtected(): MethodDecorator {
    return applyDecorators(UseGuards(SessionJtiGuard));
}