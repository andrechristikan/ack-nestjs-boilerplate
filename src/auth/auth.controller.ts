import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { ILogin, IPayload } from 'auth/auth.interface';
import { UserService } from 'user/user.service';
import { ResponseService } from 'response/response.service';
import { Response } from 'response/response.decorator';
import { IResponseSuccess } from 'response/response.interface';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';

import { AuthLocal } from 'auth/auth.decorator';

@Controller('api/auth')
export class AuthController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) {}

    @AuthLocal()
    @Post('/login')
    async login(@Body() data: ILogin): Promise<IResponseSuccess> {
        console.log('data login', data);
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
            accessToken
        });
    }
}
