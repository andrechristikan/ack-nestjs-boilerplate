import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { UserService } from 'user/user.service';
import { IPayload } from 'auth/auth.interface';
import { AUTH_DEFAULT_USERNAME_FIELD } from 'auth/auth.constant';
import { ConfigService } from '@nestjs/config';

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

        const { id, firstName, lastName, email, ...user } = (
            await this.userService.findOneByEmail(username)
        ).toJSON();

        return {
            id,
            firstName,
            lastName,
            email
        };
    }
}
