import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { IPayload } from 'src/auth/auth.interface';
import { AUTH_DEFAULT_USERNAME_FIELD } from 'src/auth/auth.constant';
import { ConfigService } from '@nestjs/config';
import { IUser } from 'src/user/user.interface';
import { Response } from 'src/response/response.decorator';
import { ResponseService } from 'src/response/response.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(
        @Response() private readonly responseService: ResponseService,
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

    async validate(username: string, password: string): Promise<IPayload> {
        const user: IUser = await this.userService.findOneByEmail(username);
        if (!user) {
            if (this.configService.get('app.debug')) {
                this.logger.error('Authorized error user not found', {
                    class: 'LocalStrategy',
                    function: 'validate'
                });
            }
            throw new UnauthorizedException();
        }

        const validate: boolean = await this.authService.validateUser(
            username,
            password
        );
        if (!validate) {
            if (this.configService.get('app.debug')) {
                this.logger.error('Authorized error', {
                    class: 'LocalStrategy',
                    function: 'validate'
                });
            }
            throw new UnauthorizedException();
        }
        const {
            id,
            email,
            firstName,
            lastName
        } = await this.userService.transformer(user);

        return {
            id,
            email,
            firstName,
            lastName
        };
    }
}
