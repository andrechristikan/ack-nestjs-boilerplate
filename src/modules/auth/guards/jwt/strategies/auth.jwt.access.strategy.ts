import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { Algorithm } from 'jsonwebtoken';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthJwtAccessGuardKey } from '@modules/auth/constants/auth.contant';

@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    AuthJwtAccessGuardKey
) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.jwt.prefix')
            ),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: true,
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
        data: IAuthJwtAccessTokenPayload
    ): Promise<IAuthJwtAccessTokenPayload> {
        return data;
    }
}
