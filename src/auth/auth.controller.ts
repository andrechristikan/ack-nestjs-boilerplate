import {
    Controller,
    Post,
    Body,
    UseGuards
} from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { ILogin, IPayload } from 'auth/auth.interface';
import { UserService } from 'user/user.service';
import { User } from 'user/user.schema';
import { ResponseService } from 'response/response.service';
import { Response } from 'response/response.decorator';
import {
    IApiSuccessResponse
} from 'response/response.interface';
import {
    SystemSuccessStatusCode,
} from 'response/response.constant';
import { AuthLoginValidation } from 'auth/validation/auth.login.validation';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { LocalGuard } from 'auth/guard/local/local.guard';

@Controller('api/auth')
export class AuthController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) {}

    @UseGuards(LocalGuard)
    @Post('/login')
    async login(
        @Body(RequestValidationPipe(AuthLoginValidation)) data: ILogin
    ): Promise<IApiSuccessResponse> {
        const checkUser: User = await this.userService.getOneByEmail(
            data.email
        );

        const payload: IPayload = {
            id: checkUser._id,
            firstName: checkUser.firstName,
            lastName: checkUser.lastName,
            email: checkUser.email
        };

        const accessToken = await this.authService.createAccessToken(payload);
        return this.responseService.success(SystemSuccessStatusCode.LOGIN, {
            ...payload,
            accessToken
        });
    }
}
