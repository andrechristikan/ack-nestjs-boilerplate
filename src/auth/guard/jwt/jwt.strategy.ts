import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AUTH_JWT_SECRET_KEY } from 'auth/auth.constant';
import { IPayload } from 'auth/auth.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.get('app.auth.jwtSecretKey') ||
                AUTH_JWT_SECRET_KEY
        });
    }

    async validate(payload: IPayload): Promise<IPayload> {
        return payload;
    }
}
