import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { AUTH_DEFAULT_USERNAME_FIELD } from 'src/auth/auth.constant';
import { ConfigService } from '@nestjs/config';
import { IUser, IUserSafe } from 'src/user/user.interface';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { UserEntity } from 'src/user/user.schema';
import { Response } from 'src/response/response.decorator';
import { ResponseService } from 'src/response/response.service';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { IResponse } from 'src/response/response.interface';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
    constructor(
        @Logger() private readonly logger: LoggerService,
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
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
        const user: IUser = await this.userService.findOneByEmail(username);
        if (!user) {
            this.logger.error('Authorized error user not found', {
                class: 'LocalStrategy',
                function: 'validate'
            });

            const response: IResponse = this.responseService.error(
                this.messageService.get('auth.login.emailNotFound')
            );

            throw new BadRequestException(response);
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

            const response: IResponse = this.responseService.error(
                this.messageService.get('auth.login.passwordNotMatch')
            );
            throw new BadRequestException(response);
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
