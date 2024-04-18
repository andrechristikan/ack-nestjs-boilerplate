import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthJwtRefreshPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.refresh-payload.dto';

@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwtRefresh'
) {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.prefixAuthorization')
            ),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: true,
                audience: configService.get<string>('auth.audience'),
                issuer: configService.get<string>('auth.issuer'),
                subject: configService.get<string>('auth.subject'),
            },
            secretOrKey: configService.get<string>(
                'auth.refreshToken.secretKey'
            ),
        });
    }

    async validate(
        data: AuthJwtRefreshPayloadDto
    ): Promise<AuthJwtRefreshPayloadDto> {
        return data;
    }
}
