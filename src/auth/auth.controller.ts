import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    BadRequestException
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { Response } from 'src/response/response.decorator';
import { UserDocumentFull } from 'src/user/user.interface';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { IResponse } from 'src/response/response.interface';
import { classToPlain } from 'class-transformer';
import { RequestValidationPipe } from 'src/pipe/request-validation.pipe';
import { AuthLoginValidation } from './validation/auth.login.validation';

@Controller('/auth')
export class AuthController {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Logger() private readonly logger: LoggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) {}

    @Post('/login')
    @Response('auth.login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body(RequestValidationPipe) data: AuthLoginValidation
    ): Promise<IResponse> {
        const user: UserDocumentFull = await this.userService.findOne<UserDocumentFull>(
            {
                email: data.email
            },
            true
        );

        if (!user) {
            this.logger.error('Authorized error user not found', {
                class: 'AuthController',
                function: 'login'
            });

            throw new BadRequestException(
                this.messageService.get('auth.error.emailNotFound')
            );
        }

        const validate: boolean = await this.authService.validateUser(
            data.password,
            user.password
        );

        if (!validate) {
            this.logger.error('Authorized error', {
                class: 'AuthController',
                function: 'login'
            });

            throw new BadRequestException(
                this.messageService.get('auth.error.passwordNotMatch')
            );
        }

        const safe: Record<string, any> = await this.userService.safeLogin(
            user
        );
        const accessToken: string = await this.authService.createAccessToken(
            classToPlain(safe),
            data.rememberMe ? true : false
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            classToPlain(safe),
            data.rememberMe ? true : false
        );

        return {
            accessToken,
            refreshToken
        };
    }
}
