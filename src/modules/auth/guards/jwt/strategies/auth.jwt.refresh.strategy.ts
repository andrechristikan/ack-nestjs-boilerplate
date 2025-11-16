import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { Algorithm } from 'jsonwebtoken';
import { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtRefreshGuardKey } from '@modules/auth/constants/auth.constant';

/**
 * JWT Refresh Token Strategy for authentication using Passport.js
 * This strategy validates JWT refresh tokens using JWKS (JSON Web Key Set) endpoint
 * and extracts the JWT token from the Authorization header with a configurable prefix.
 * Used specifically for token refresh operations in the authentication flow.
 */
@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    AuthJwtRefreshGuardKey
) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.jwt.prefix')
            ),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
                audience: configService.get<string>('auth.jwt.audience'),
                issuer: configService.get<string>('auth.jwt.issuer'),
            },
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: configService.get<string>(
                    'auth.jwt.refreshToken.jwksUri'
                ),
            }),
            algorithms: [
                configService.get<Algorithm>('auth.jwt.refreshToken.algorithm'),
            ],
        });
    }

    /**
     * Validates the JWT refresh token payload after successful verification
     * This method is called by Passport after the JWT refresh token has been verified
     * against the JWKS endpoint and its signature is valid.
     *
     * @param data - The decoded JWT refresh token payload containing user information
     * @returns The validated JWT refresh token payload that will be attached to the request object
     */
    async validate(
        data: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        return data;
    }
}
