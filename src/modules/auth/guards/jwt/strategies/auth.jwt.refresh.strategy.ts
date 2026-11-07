import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import type { Algorithm } from 'jsonwebtoken';
import type { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    AuthBearerScheme,
    AuthJwtRefreshGuardKey,
} from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';

@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    AuthJwtRefreshGuardKey
) {
    constructor(
        protected readonly configService: ConfigService,
        private readonly authService: AuthService
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
                    'auth.jwt.refreshToken.jwksUri'
                )!,
            }),
            algorithms: [
                configService.get<Algorithm>(
                    'auth.jwt.refreshToken.algorithm'
                )!,
            ],
        });
    }

    async validate(
        data: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        return this.authService.validateJwtRefreshStrategy(data);
    }
}
