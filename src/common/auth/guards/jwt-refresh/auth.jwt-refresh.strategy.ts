import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/common/auth/services/auth.service';

@Injectable()
export class AuthJwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwtRefresh'
) {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme(
                configService.get<string>('auth.prefixAuthorization')
            ),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
                audience: configService.get<string>('auth.audience'),
                issuer: configService.get<string>('auth.issuer'),
                subject: configService.get<string>('auth.subject'),
            },
            secretOrKey: configService.get<string>(
                'auth.refreshToken.secretKey'
            ),
        });
    }

    async validate({
        data,
    }: Record<string, any>): Promise<Record<string, any>> {
        const payloadEncryption: boolean =
            await this.authService.getPayloadEncryption();

        return payloadEncryption
            ? this.authService.decryptRefreshToken({ data })
            : data;
    }
}
