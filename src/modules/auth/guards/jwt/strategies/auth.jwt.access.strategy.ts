import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { Algorithm } from 'jsonwebtoken';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtAccessGuardKey } from '@modules/auth/constants/auth.constant';
import { AuthService } from '@modules/auth/services/auth.service';

/**
 * JWT Access Token Strategy for Passport
 *
 * This strategy is responsible for validating JWT access tokens in incoming requests.
 * It extracts the JWT token from the Authorization header, verifies its signature
 * using JWKS (JSON Web Key Set), and validates the token payload.
 *
 */
@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    AuthJwtAccessGuardKey
) {
    /**
     * Creates an instance of AuthJwtAccessStrategy.
     *
     * @param {ConfigService} configService - Service for accessing configuration values
     * @param {AuthService} authService - Service for authentication operations
     *
     * @note We don't validate JTI (JWT ID) claims in this strategy
     */
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        // @note: we don't validate jti here
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.jwt.prefix')
            ),
            ignoreExpiration: false,
            passReqToCallback: false,
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
                    'auth.jwt.accessToken.jwksUri'
                ),
            }),
            algorithms: [
                configService.get<Algorithm>('auth.jwt.accessToken.algorithm'),
            ],
        });
    }

    /**
     * Validates the JWT access token payload
     *
     * This method is called after the JWT token has been successfully verified.
     * It delegates further validation to the AuthService to ensure the user
     * and token are still valid in the application context.
     *
     * @param {IAuthJwtAccessTokenPayload} data - The decoded JWT token payload
     * @returns {Promise<IAuthJwtAccessTokenPayload>} The validated token payload
     *
     */
    async validate(
        data: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        return this.authService.validateJwtAccessStrategy(data);
    }
}
