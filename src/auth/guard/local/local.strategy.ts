import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { User } from 'user/user.schema';
import { UserService } from 'user/user.service';
import { IPayload } from 'auth/auth.interface';
import { Config } from 'config/config.decorator';
import { ConfigService } from 'config/config.service';
import { DEFAULT_USERNAME_FIELD } from 'auth/auth.constant';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(
        @Config() private readonly configService: ConfigService,
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) {
        super({
            usernameField:
                configService.getEnv('DEFAULT_USERNAME_FIELD') ||
                DEFAULT_USERNAME_FIELD,
            passwordField: 'password',
            session: false
        });
    }

    async validate(username: string, password: string): Promise<IPayload> {
        const validate: boolean = await this.authService.validateUser(
            username,
            password
        );
        if (!validate) {
            throw new UnauthorizedException();
        }

        const user: User = await this.userService.getOneByEmail(username);

        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
        };
    }
}
