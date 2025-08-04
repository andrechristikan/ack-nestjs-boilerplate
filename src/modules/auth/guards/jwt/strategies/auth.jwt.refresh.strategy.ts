import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { Algorithm } from 'jsonwebtoken';
import { IAuthJwtRefreshTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtRefreshGuardKey } from '@modules/auth/constants/auth.contant';

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
                jwksUri: configService.get<string>('auth.jwt.jwksUri'),
            }),
            algorithms: [configService.get<Algorithm>('auth.jwt.algorithm')],
        });
    }

    async validate(
        data: IAuthJwtRefreshTokenPayload
    ): Promise<IAuthJwtRefreshTokenPayload> {
        return data;
    }
}
