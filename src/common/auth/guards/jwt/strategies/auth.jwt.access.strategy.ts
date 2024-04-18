import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthJwtAccessPayloadDto } from 'src/common/auth/dtos/jwt/auth.jwt.access-payload.dto';

@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    'jwtAccess'
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
                'auth.accessToken.secretKey'
            ),
        });
    }

    async validate(
        data: AuthJwtAccessPayloadDto
    ): Promise<AuthJwtAccessPayloadDto> {
        return data;
    }
}
