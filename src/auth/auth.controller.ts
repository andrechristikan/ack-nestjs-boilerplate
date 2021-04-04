import {
    Controller,
    Post,
    Body,
    Headers,
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
import { AuthBasic } from 'src/auth/auth.decorator';
import { ConfigService } from '@nestjs/config';
import {
    AUTH_DEFAULT_USERNAME_FIELD,
    AUTH_JWT_EXPIRATION_TIME
} from 'src/auth/auth.constant';
import { IUser, IUserSafe } from 'src/user/user.interface';
import { UserEntity } from 'src/user/user.schema';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';

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

        const user: UserEntity = await this.userService.findOneByEmail(
            data[defaultUsernameField]
        );

        if (!user) {
            this.logger.error('Authorized error user not found', {
                class: 'AuthController',
                function: 'login'
            });

            const response: IResponse = this.responseService.error(
                this.messageService.get('auth.login.emailNotFound')
            );

            throw new BadRequestException(response);
        }

        const validate: boolean = await this.authService.validateUser(
            data[defaultUsernameField],
            data.password
        );
        
        if (!validate) {
            this.logger.error('Authorized error', {
                class: 'AuthController',
                function: 'login'
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


        const accessToken: string = await this.authService.createAccessToken({
            id,
            email,
            firstName,
            lastName
        });

        return this.responseService.success(
            this.messageService.get('auth.login.success'),
            {
                accessToken,
                expiredIn
            }
        );
    }

    @AuthBasic()
    @HttpCode(HttpStatus.OK)
    @ResponseStatusCode()
    @Post('/basic-token')
    async loginBasicToken(
        @Headers('Authorization') authorization: string
    ): Promise<IResponse> {
        // Env Variable
        const expiredIn: number | string =
            this.configService.get('auth.jwtExpirationTime') ||
            AUTH_JWT_EXPIRATION_TIME;

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const payload: Record<string, any> = {
            clientBasicToken
        };

        const accessToken: string = await this.authService.createAccessToken(
            payload
        );
        return this.responseService.success(
            this.messageService.get('auth.basicToken.success'),
            {
                accessToken,
                expiredIn
            }
        );
    }
}
