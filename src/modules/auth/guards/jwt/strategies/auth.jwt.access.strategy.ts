import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import type { Algorithm } from 'jsonwebtoken';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtAccessGuardKey } from '@modules/auth/constants/auth.constant';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

/** Passport strategy validating access tokens via JWKS, default algorithm ES256. */
@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    AuthJwtAccessGuardKey
) {
    constructor(
        private readonly authDomain: AuthDomain,
        configService: ConfigService
    ) {
        // jti is not validated here.
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.jwt.prefix')!
            ),
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
                jwksRequestsPerMinute: 5,
                jwksUri: configService.get<string>(
                    'auth.jwt.accessToken.jwksUri'
                )!,
            }),
            algorithms: [
                configService.get<Algorithm>('auth.jwt.accessToken.algorithm')!,
            ],
        });
    }

    /** Runs after signature verification; delegates session/payload checks to AuthDomain. */
    async validate(
        data: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        return this.authDomain.validateJwtAccessStrategy(data);
    }
}
