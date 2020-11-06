import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
    DefaultValuePipe,
    ParseIntPipe,
    UseGuards 
} from '@nestjs/common';
import { UserService } from 'user/user.service';
import { ErrorService } from 'error/error.service';
import { SystemErrorStatusCode } from 'error/error.constant';
import { User } from 'user/user.schema';
import {
    IUserStore,
    IUserUpdate,
    IUserSearch,
    IUserSearchCollection
} from 'user/user.interface';
import { ResponseService } from 'middleware/response/response.service';
import { IApiResponseSuccess } from 'middleware/response/response.interface';
import { IApiError } from 'error/error.interface';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { Response } from 'middleware/response/response.decorator';
import { Error } from 'error/error.decorator';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { UserSearchValidation } from 'user/validation/user.search.validation';
import { UserStoreValidation } from 'user/validation/user.store.validation';
import { UserUpdateValidation } from 'user/validation/user.update.validation';
import { JwtGuard } from 'auth/guard/jwt.guard';

@Controller('api/user')
export class UserController {
    constructor(
        @Error() private readonly errorService: ErrorService,
        @Response() private readonly responseService: ResponseService,
        @Language() private readonly languageService: LanguageService,
        private readonly userService: UserService
    ) {}

    @Get('/')
    async getAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query(RequestValidationPipe(UserSearchValidation)) data: IUserSearch
    ): Promise<IApiResponseSuccess> {
        const { skip } = this.responseService.pagination(page, limit);

        const search: IUserSearchCollection = await this.userService.search(
            data
        );
        const user: User[] = await this.userService.getAll(skip, limit, search);
        return this.responseService.success(
            200,
            this.languageService.get('user.getAll.success'),
            user
        );
    }

    @Get('/:id')
    async getOneById(@Param('id') id: string): Promise<IApiResponseSuccess> {
        const checkUser: User = await this.userService.getOneById(id);
        if (!checkUser) {
            const res: IApiError = this.errorService.setErrorMessage(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            return this.responseService.error(res);
        }

        const { password, salt, ...user } = checkUser.toJSON();
        return this.responseService.success(
            200,
            this.languageService.get('user.getById.success'),
            user
        );
    }

    // @UseGuards(JwtGuard)
    @Post('/store')
    async store(
        @Body(RequestValidationPipe(UserStoreValidation)) data: IUserStore
    ): Promise<IApiResponseSuccess> {
        const existEmail: Promise<User> = this.userService.getOneByEmail(
            data.email
        );
        const existMobileNumber: Promise<User> = this.userService.getOneByMobileNumber(
            data.mobileNumber
        );

        return Promise.all([existEmail, existMobileNumber])
            .then(async ([userExistEmail, userExistMobileNumber]) => {
                const errors: IApiError[] = [];
                if (userExistEmail) {
                    errors.push({
                        statusCode: SystemErrorStatusCode.USER_EMAIL_EXIST,
                        property: 'email'
                    });
                }
                if (userExistMobileNumber) {
                    errors.push({
                        statusCode:
                            SystemErrorStatusCode.USER_MOBILE_NUMBER_EXIST,
                        property: 'mobileNumber'
                    });
                }

                if (errors.length > 0) {
                    const res: IApiError = this.errorService.setErrorMessage(
                        SystemErrorStatusCode.USER_EXIST,
                        errors
                    );
                    return this.responseService.error(res);
                }

                try {
                    const { password, salt, ...user }: User = (
                        await this.userService.store(data)
                    ).toJSON();

                    return this.responseService.success(
                        201,
                        this.languageService.get('user.store.success'),
                        user
                    );
                } catch (e) {
                    return this.responseService.error(
                        this.errorService.setErrorMessage(
                            SystemErrorStatusCode.GENERAL_ERROR
                        )
                    );
                }
            })
            .catch(err => {
                throw err;
            });
    }

    @UseGuards(JwtGuard)
    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<IApiResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            const res: IApiError = this.errorService.setErrorMessage(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            return this.responseService.error(res);
        }

        await this.userService.destroy(id);
        return this.responseService.success(
            200,
            this.languageService.get('user.destroy.success')
        );
    }

    @UseGuards(JwtGuard)
    @Put('/update/:id')
    async update(
        @Param('id') id: string,
        @Body(RequestValidationPipe(UserUpdateValidation)) data: IUserUpdate
    ): Promise<IApiResponseSuccess> {
        const checkUser: User = await this.userService.getOneById(id);
        if (!checkUser) {
            const res: IApiError = this.errorService.setErrorMessage(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            return this.responseService.error(res);
        }

        try {
            const { password, salt, ...user }: User = (
                await this.userService.update(id, data)
            ).toJSON();

            return this.responseService.success(
                200,
                this.languageService.get('user.update.success'),
                user
            );
        } catch (e) {
            return this.responseService.error(
                this.errorService.setErrorMessage(SystemErrorStatusCode.GENERAL_ERROR)
            );
        }
    }
}
