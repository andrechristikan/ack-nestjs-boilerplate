import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from '@modules/session/services/session.service';
import { Reflector } from '@nestjs/core';
import { ENUM_SESSION_STATUS_CODE_ERROR } from '@modules/session/enums/session.status-code.enum';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IAuthJwtAccessTokenPayload, IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class SessionJtiGuard implements CanActivate {
    constructor(
        private readonly sessionService: SessionService,
        private readonly reflector: Reflector
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthJwtRefreshTokenPayload>>();
        const user = request.user;

        if (!user || !user.session || !user.jti) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        const session = await this.sessionService.findOneActiveById(user.session);
        if (!session) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        if (session.jti !== user.jti) {
            throw new UnauthorizedException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.INVALID_JTI,
                message: 'session.error.invalidJti',
            });
        }

        return true;
    }
}
