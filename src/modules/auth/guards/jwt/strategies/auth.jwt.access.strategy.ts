import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import type { Algorithm } from 'jsonwebtoken';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    AuthBearerScheme,
    AuthJwtAccessGuardKey,
} from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';
import { SessionService } from '@modules/session/services/session.service';

@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    AuthJwtAccessGuardKey
) {
    constructor(
        protected readonly configService: ConfigService,
        private readonly authService: AuthService,
        private readonly sessionService: SessionService
    ) {
        // jti is not validated here.
        super({
            jwtFromRequest:
                ExtractJwt.fromAuthHeaderWithScheme(AuthBearerScheme),
            ignoreExpiration: false,
            passReqToCallback: false,
            audience: configService.get<string>('auth.jwt.audience')!,
            issuer: configService.get<string>('auth.jwt.issuer')!,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
            },
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: configService.get<number>(
                    'auth.jwks.requestsPerMinute'
                )!,
                cacheMaxAge: configService.get<number>(
                    'auth.jwks.cacheMaxAgeInMs'
                )!,
                jwksUri: configService.get<string>(
                    'auth.jwt.accessToken.jwksUri'
                )!,
            }),
            algorithms: [
                configService.get<Algorithm>('auth.jwt.accessToken.algorithm')!,
            ],
        });
    }

    async validate(
        data: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        const payload = this.authService.validateJwtAccessStrategy(data);
        const login = await this.sessionService.getLogin(
            payload.sub,
            payload.sessionId
        );

        return this.authService.validateJwtAccessSession(
            payload,
            login?.jtiDigest ?? null
        );
    }
}
