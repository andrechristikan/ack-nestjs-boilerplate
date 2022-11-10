import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/common/auth/services/auth.service';

@Injectable()
export class AuthJwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.jwt.prefixAuthorization')
            ),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
                audience: configService.get<string>('auth.jwt.audience'),
                issuer: configService.get<string>('auth.jwt.issuer'),
                subject: configService.get<string>('auth.jwt.subject'),
            },
            secretOrKey: configService.get<string>(
                'auth.jwt.accessToken.secretKey'
            ),
        });
    }

    async validate({
        data,
    }: Record<string, any>): Promise<Record<string, any>> {
        return this.configService.get<boolean>('auth.jwt.payloadEncryption')
            ? this.authService.decryptAccessToken(data)
            : data;
    }
}
