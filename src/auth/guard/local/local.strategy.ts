import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { IPayload } from 'src/auth/auth.interface';
import { AUTH_DEFAULT_USERNAME_FIELD } from 'src/auth/auth.constant';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/user/user.interface';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(
        private readonly configService: ConfigService,
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) {
        super({
            usernameField:
                configService.get('app.auth.usernameField') ||
                AUTH_DEFAULT_USERNAME_FIELD,
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

        const user: IUser = await this.userService.findOneByEmail(username);
        const {
            id,
            email,
            firstName,
            lastName,
            ...others
        } = await this.userService.transformer(user);
        return {
            id,
            email,
            firstName,
            lastName
        };
    }
}
