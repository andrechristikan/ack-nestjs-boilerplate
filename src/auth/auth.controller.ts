import {
    Controller,
    Post,
    Body,
    BadRequestException
} from '@nestjs/common';
import { AuthService } from 'auth/auth.service';
import { ILogin, IPayload } from 'auth/auth.interface';
import { UserService } from 'user/user.service';
import { User } from 'user/user.schema';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { ResponseService } from 'response/response.service';
import { Response } from 'response/response.decorator';
import { IApiSuccessResponse, IApiErrorResponse, IApiErrorMessage, IApiErrors } from 'response/response.interface';
import { SystemSuccessStatusCode, SystemErrorStatusCode } from 'response/response.constant';


@Controller('api/auth')
export class AuthController {
    constructor(
        @Language() private readonly languageService: LanguageService,
        @Response() private readonly responseService: ResponseService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}


    @Post('/login')
    async store(
        // @Body(RequestValidationPipe(AuthLoginValidation)) data: ILogin
        @Body() data: ILogin
    ): Promise<IApiSuccessResponse> {

        const checkUser: User = await this.userService.getOneByEmail(data.email);
        if (!checkUser) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const payload: IPayload = {
            id: checkUser._id,
            firstName: checkUser.firstName,
            lastName: checkUser.lastName,
            email: checkUser.email,
        };

        const accessToken = await this.authService.createAccessToken(payload);
        return this.responseService.success(
            SystemSuccessStatusCode.OK,
            {
                ...payload,
                accessToken
            }
        );
    }
}