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
import { AuthDomain } from '@modules/auth/domains/auth.domain';

@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    AuthJwtRefreshGuardKey
) {
    constructor(
        protected readonly configService: ConfigService,
        private readonly authDomain: AuthDomain
    ) {
        // jti is not validated here.
        super({
            jwtFromRequest:
                ExtractJwt.fromAuthHeaderWithScheme(AuthBearerScheme),
            ignoreExpiration: false,
            passReqToCallback: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
                audience: configService.get<string>('auth.jwt.audience')!,
                issuer: configService.get<string>('auth.jwt.issuer')!,
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
        return this.authDomain.validateJwtRefreshStrategy(data);
    }
}
