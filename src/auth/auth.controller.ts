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
import { IUserDocument } from 'src/user/user.interface';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { IResponse } from 'src/response/response.interface';
import { classToPlain } from 'class-transformer';
import { RequestValidationPipe } from 'src/pipe/request-validation.pipe';
import { AuthLoginValidation } from './validation/auth.login.validation';
import { LoggerService } from 'src/logger/logger.service';
import { ENUM_LOGGER_ACTION } from 'src/logger/logger.constant';
import { AuthJwtRefreshGuard, Token } from './auth.decorator';

@Controller('/auth')
export class AuthController {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly loggerService: LoggerService
    ) {}

    @Post('/login')
    @Response('auth.login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body(RequestValidationPipe) data: AuthLoginValidation
    ): Promise<IResponse> {
        const rememberMe: boolean = data.rememberMe ? true : false;
        const user: IUserDocument = await this.userService.findOne<IUserDocument>(
            {
                email: data.email
            },
            true
        );

        if (!user) {
            this.debuggerService.error('Authorized error user not found', {
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
            this.debuggerService.error('Authorized error', {
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
        const payload: Record<string, any> = {
            ...classToPlain(safe),
            rememberMe
        };
        const accessToken: string = await this.authService.createAccessToken(
            payload,
            rememberMe
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payload,
            rememberMe
        );

        await this.loggerService.info(
            ENUM_LOGGER_ACTION.LOGIN,
            `${user._id} do login`,
            user._id,
            ['login', 'withEmail']
        );

        return {
            accessToken,
            refreshToken
        };
    }

    @Post('/refresh')
    @Response('auth.refresh')
    @AuthJwtRefreshGuard()
    @HttpCode(HttpStatus.OK)
    async refresh(@Token() token: string): Promise<IResponse> {
        const {
            exp,
            nbf,
            iat,
            ...payload
        }: Record<string, any> = await this.authService.payloadRefreshToken(
            token
        );

        const accessToken: string = await this.authService.createAccessToken(
            payload,
            payload.rememberMe
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payload,
            payload.rememberMe
        );

        return {
            accessToken,
            refreshToken
        };
    }
}
