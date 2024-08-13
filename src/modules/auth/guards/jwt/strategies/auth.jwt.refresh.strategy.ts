import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';

@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwtRefresh'
) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.jwt.prefixAuthorization')
            ),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
                audience: configService.get<string>('auth.jwt.audience'),
                issuer: configService.get<string>('auth.jwt.issuer'),
            },
            secretOrKey: configService.get<string>(
                'auth.jwt.refreshToken.secretKey'
            ),
        });
    }

    async validate(
        data: AuthJwtRefreshPayloadDto
    ): Promise<AuthJwtRefreshPayloadDto> {
        return data;
    }
}
