import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { ILogin, IPayload, IPayloadBasicToken } from 'auth/auth.interface';
import { UserService } from 'user/user.service';
import { ResponseService } from 'response/response.service';
import { Response } from 'response/response.decorator';
import { IResponseSuccess } from 'response/response.interface';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';

import { AuthBasic, AuthLocal } from 'auth/auth.decorator';
import { ConfigService } from '@nestjs/config';
import { AUTH_JWT_EXPIRATION_TIME } from 'auth/auth.constant';

@Controller('api/auth')
export class AuthController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {}

    @AuthLocal()
    @Post('/login')
    async login(@Body() data: ILogin): Promise<IResponseSuccess> {
        // Env Variable
        const expiredIn: number | string =
            this.configService.get('auth.jwtExpirationTime') ||
            AUTH_JWT_EXPIRATION_TIME;

        const { id, firstName, lastName, email, ...user } = (
            await this.userService.findOneByEmail(data.email)
        ).toJSON();

        const payload: IPayload = {
            id,
            firstName,
            lastName,
            email
        };

        const accessToken: string = await this.authService.createAccessToken(
            payload
        );
        return this.responseService.success(AppSuccessStatusCode.LOGIN, {
            ...payload,
            accessToken,
            expiredIn
        });
    }

    @AuthBasic()
    @Post('/login-basic-token')
    async loginBasicToken(
        @Headers('Authorization') authorization: string
    ): Promise<IResponseSuccess> {
        // Env Variable
        const expiredIn: number | string =
            this.configService.get('auth.jwtExpirationTime') ||
            AUTH_JWT_EXPIRATION_TIME;

        const clientBasicToken: string = authorization.replace('Basic ', '');
        const payload: IPayloadBasicToken = {
            clientBasicToken
        };

        const accessToken: string = await this.authService.createAccessToken(
            payload
        );
        return this.responseService.success(AppSuccessStatusCode.LOGIN, {
            accessToken,
            expiredIn
        });
    }
}
