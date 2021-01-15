import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JWT_SECRET_KEY } from 'auth/auth.constant';
import { IPayload } from 'auth/auth.interface';
import { Config } from 'config/config.decorator';
import { ConfigService } from 'config/config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(@Config() private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.getEnv('JWT_SECRET_KEY') || JWT_SECRET_KEY
        });
    }

    async validate(payload: IPayload): Promise<IPayload> {
        return payload;
    }
}
