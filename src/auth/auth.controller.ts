import {
    Controller,
    Post,
    Body
} from '@nestjs/common';
import { Error } from 'error/error.decorator';
import { ErrorService } from 'error/error.service';
import { ResponseService } from 'middleware/response/response.service';
import { Response } from 'middleware/response/response.decorator';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { AuthService } from 'auth/auth.service';
import { AuthLoginValidation } from 'auth/validation/auth.login.validation';
import { ILogin, IPayload } from 'auth/auth.interface';
import { IApiResponseSuccess } from 'middleware/response/response.interface';
import { UserService } from 'user/user.service';
import { User } from 'user/user.schema';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { IApiError } from 'error/error.interface';
import { SystemErrorStatusCode } from 'error/error.constant';

@Controller('api/auth')
export class AuthController {
    constructor(
        @Language() private readonly languageService: LanguageService,
        @Response() private readonly responseService: ResponseService,
        @Error() private readonly errorService: ErrorService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {}


    @Post('/login')
    async store(
        @Body(RequestValidationPipe(AuthLoginValidation))
        data: ILogin
    ): Promise<IApiResponseSuccess> {

        const checkUser: User = await this.userService.getOneByEmail(data.email);
        if (!checkUser) {
            const res: IApiError = this.errorService.setErrorMessage(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            return this.responseService.error(res);
        }

        const user: Record<string, any> = {
            id: checkUser._id,
            firstName: checkUser.firstName,
            lastName: checkUser.lastName,
            email: checkUser.email,
        };
        const payload: IPayload = {
            userId: checkUser._id,
        };
        const accessToken = await this.authService.createAccessToken(payload);
        return this.responseService.success(
            200, 
            this.languageService.get('auth.login.success'),
            {
                ...user,
                accessToken
            }
        );
    }
}