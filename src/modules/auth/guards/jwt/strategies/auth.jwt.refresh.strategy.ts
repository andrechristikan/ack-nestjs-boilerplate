import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import type { Algorithm } from 'jsonwebtoken';
import type { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtRefreshGuardKey } from '@modules/auth/constants/auth.constant';
import { AuthDomain } from '@modules/auth/domains/auth.domain';

/** Passport strategy validating refresh tokens via JWKS, default algorithm ES512. */
@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    AuthJwtRefreshGuardKey
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

    /** Runs after signature verification; delegates session/payload checks to AuthDomain. */
    async validate(
        data: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        return this.authDomain.validateJwtRefreshStrategy(data);
    }
}
