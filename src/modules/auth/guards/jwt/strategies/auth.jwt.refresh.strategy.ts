import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { Algorithm } from 'jsonwebtoken';
import { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtRefreshGuardKey } from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';

/** Passport strategy validating refresh tokens via JWKS, default algorithm ES512. */
@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    AuthJwtRefreshGuardKey
) {
    constructor(
        private readonly authService: AuthService,
        configService: ConfigService
    ) {
        // @note: we don't validate jti here
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
                configService.get<Algorithm>('auth.jwt.refreshToken.algorithm')!,
            ],
        });
    }

    /** Runs after signature verification; delegates session/payload checks to AuthService. */
    async validate(
        data: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        return this.authService.validateJwtRefreshStrategy(data);
    }
}
