import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { AUTH_DEFAULT_USERNAME_FIELD } from 'src/auth/auth.constant';
import { ConfigService } from '@nestjs/config';
import { IUserSafe } from 'src/user/user.interface';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { UserEntity } from 'src/user/user.schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(
        @Logger() private readonly logger: LoggerService,
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

    async validate(
        username: string,
        password: string
    ): Promise<Record<string, any>> {
        const user: UserEntity = await this.userService.findOneByEmail(
            username
        );
        if (!user) {
            this.logger.error('Authorized error user not found', {
                class: 'LocalStrategy',
                function: 'validate'
            });
            throw new UnauthorizedException();
        }

        const validate: boolean = await this.authService.validateUser(
            username,
            password
        );
        if (!validate) {
            this.logger.error('Authorized error', {
                class: 'LocalStrategy',
                function: 'validate'
            });

            throw new UnauthorizedException();
        }
        const {
            id,
            email,
            firstName,
            lastName
        } = await this.userService.transformer<IUserSafe, UserEntity>(user);

        return {
            id,
            email,
            firstName,
            lastName
        };
    }
}
