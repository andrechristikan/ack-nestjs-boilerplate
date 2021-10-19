import { Controller, Post, Body, HttpStatus } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { IUserDocument } from 'src/user/user.interface';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { classToPlain } from 'class-transformer';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import { AuthLoginValidation } from './validation/auth.login.validation';
import { LoggerService } from 'src/logger/logger.service';
import { ENUM_LOGGER_ACTION } from 'src/logger/logger.constant';
import { AuthJwtRefreshGuard, User } from './auth.decorator';
import { Response } from 'src/response/response.decorator';
import { IResponse } from 'src/response/response.interface';
import { ENUM_ERROR_STATUS_CODE } from 'src/error/error.constant';
import { ErrorHttpException } from 'src/error/filter/error.http.filter';
import { UserLoginTransformer } from 'src/user/transformer/user.login.transformer';
import { IPayload } from './auth.interface';

@Controller('/auth')
export class AuthController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly loggerService: LoggerService
    ) {}

    @Post('/login')
    @Response('auth.login', HttpStatus.OK)
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

            throw new ErrorHttpException(
                ENUM_ERROR_STATUS_CODE.AUTH_USER_NOT_FOUND_ERROR
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

            throw new ErrorHttpException(
                ENUM_ERROR_STATUS_CODE.AUTH_PASSWORD_NOT_MATCH_ERROR
            );
        }

        const safe: UserLoginTransformer = await this.userService.mapLogin(
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
    @AuthJwtRefreshGuard()
    @Response('auth.refresh', HttpStatus.OK)
    async refresh(@User() payload: IPayload): Promise<IResponse> {
        const { exp, nbf, iat, ...others } = payload;

        const accessToken: string = await this.authService.createAccessToken(
            others,
            others.rememberMe
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            others,
            others.rememberMe
        );

        return {
            accessToken,
            refreshToken
        };
    }
}
