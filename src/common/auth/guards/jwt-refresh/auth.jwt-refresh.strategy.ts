import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
    Strategy,
    'jwtRefresh'
) {
    constructor(
        private readonly configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService
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
                'auth.jwt.refreshToken.secretKey'
            ),
        });
    }

    async validate({
        data,
    }: Record<string, any>): Promise<Record<string, any>> {
        return this.helperEncryptionService.aes256Decrypt(
            data,
            this.configService.get<string>('auth.jwt.refreshToken.encryptKey'),
            this.configService.get<string>('auth.jwt.refreshToken.encryptIv')
        ) as Record<string, any>;
    }
}
