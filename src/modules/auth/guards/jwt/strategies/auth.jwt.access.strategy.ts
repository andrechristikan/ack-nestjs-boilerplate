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
import { AuthDomain } from '@modules/auth/domains/auth.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';

/** Passport strategy validating access tokens via JWKS, default algorithm ES256. */
@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    AuthJwtAccessGuardKey
) {
    constructor(
        protected readonly configService: ConfigService,
        private readonly authDomain: AuthDomain,
        private readonly sessionDomain: SessionDomain
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
                    'auth.jwt.accessToken.jwksUri'
                )!,
            }),
            algorithms: [
                configService.get<Algorithm>('auth.jwt.accessToken.algorithm')!,
            ],
        });
    }

    /** Runs after signature verification; checks the payload, reads the login through SessionDomain, then checks the session. */
    async validate(
        data: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        const payload = this.authDomain.validateJwtAccessStrategy(data);
        const login = await this.sessionDomain.getLogin(
            payload.sub,
            payload.sessionId
        );

        return this.authDomain.validateJwtAccessSession(
            payload,
            login?.jti ?? null
        );
    }
}
