import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';

@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(
    Strategy,
    'jwtAccess'
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
            secretOrKey: configService.get<string>(
                'auth.jwt.accessToken.secretKey'
            ),
        });
    }

    async validate(
        data: AuthJwtAccessPayloadDto
    ): Promise<AuthJwtAccessPayloadDto> {
        return data;
    }
}
