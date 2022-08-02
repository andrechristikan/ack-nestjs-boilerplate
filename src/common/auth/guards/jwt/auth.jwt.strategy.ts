import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            jsonWebTokenOptions: {
                ignoreNotBefore: false,
            },
            secretOrKey: configService.get<string>(
                'auth.jwt.accessToken.secretKey'
            ),
        });
    }

    async validate(payload: Record<string, any>): Promise<Record<string, any>> {
        return payload;
    }
}
