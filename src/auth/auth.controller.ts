import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { ILogin } from 'src/auth/auth.interface';
import { UserService } from 'src/user/user.service';
import { ResponseService } from 'src/response/response.service';
import { Response, ResponseStatusCode } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { ConfigService } from '@nestjs/config';
import {
    AUTH_DEFAULT_USERNAME_FIELD,
    AUTH_JWT_EXPIRATION_TIME
} from 'src/auth/auth.constant';
import { UserDocumentFull, UserSafe } from 'src/user/user.interface';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { compare } from 'bcrypt';

@Controller('/auth')
export class AuthController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        @Logger() private readonly logger: LoggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {}

    @HttpCode(HttpStatus.OK)
    @ResponseStatusCode()
    @Post('/login')
    async login(@Body() data: ILogin): Promise<IResponse> {
        // Env Variable
        const expiredIn: number | string =
            this.configService.get('auth.jwtExpirationTime') ||
            AUTH_JWT_EXPIRATION_TIME;
        const defaultUsernameField: string | string =
            this.configService.get('auth.defaultUsernameField') ||
            AUTH_DEFAULT_USERNAME_FIELD;

        const user: UserDocumentFull = await this.userService.findOneByEmail(
            data[defaultUsernameField]
        );

        if (!user) {
            this.logger.error('Authorized error user not found', {
                class: 'AuthController',
                function: 'login'
            });

            throw new BadRequestException(
                this.responseService.error(
                    this.messageService.get('auth.login.emailNotFound')
                )
            );
        }

        const validate: boolean = await compare(data.password, user.password);
        if (!validate) {
            this.logger.error('Authorized error', {
                class: 'AuthController',
                function: 'login'
            });

            throw new BadRequestException(
                this.responseService.error(
                    this.messageService.get('auth.login.passwordNotMatch')
                )
            );
        }
        
        const userSafe: UserSafe = await this.userService.transformer(user);
        const { _id, email, firstName, lastName, isAdmin, role } = userSafe;
        const accessToken: string = await this.authService.createAccessToken({
            _id,
            email,
            firstName,
            lastName,
            isAdmin,
            role
        });

        return this.responseService.success(
            this.messageService.get('auth.login.success'),
            {
                accessToken,
                expiredIn
            }
        );
    }
}
