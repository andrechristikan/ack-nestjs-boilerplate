import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestEnvMetaKey } from '@common/request/constants/request.constant';
import { RequestEnvForbiddenException } from '@common/request/exceptions/request.env-forbidden.exception';

/**
 * Allows a route only when the current app environment is in its allowed list; else 403.
 */
@Injectable()
export class RequestEnvGuard implements CanActivate {
    private readonly env: EnumAppEnvironment;

    constructor(
        private readonly reflector: Reflector,
        private readonly configService: ConfigService
    ) {
        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const required: EnumAppEnvironment[] = this.reflector.getAllAndOverride<
            EnumAppEnvironment[]
        >(RequestEnvMetaKey, [context.getHandler(), context.getClass()]);

        if (!required || !required.includes(this.env)) {
            throw new RequestEnvForbiddenException();
        }

        return true;
    }
}
