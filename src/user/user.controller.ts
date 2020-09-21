import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
} from '@nestjs/common';
import { UserService } from 'user/user.service';
import { ErrorService } from 'error/error.service';
import { SystemErrorStatusCode } from 'error/error.constant';
import { User } from 'user/user.model';
import {
    UserStore,
    UserUpdate,
    UserSearch,
    UserSearchCollection,
} from 'user/user.interface';
import { ApiResponseService } from 'helper/api-response/api-response.service';
import { IApiResponseSuccess } from 'helper/api-response/api-response.interface';
import { IApiError } from 'error/error.interface';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { ApiResponse } from 'helper/api-response/api-response.decorator';
import { Error } from 'error/error.decorator';

@Controller('api/user')
export class UserController {
    constructor(
        @Error() private readonly errorService: ErrorService,
        @ApiResponse() private readonly apiResponseService: ApiResponseService,
        @Language() private readonly languageService: LanguageService,
        private readonly userService: UserService,
    ) {}

    @Get('/')
    async getAll(@Query() data: UserSearch): Promise<IApiResponseSuccess> {
        const { skip, limit } = this.apiResponseService.pagination(
            data.page,
            data.limit,
        );

        const search: UserSearchCollection = await this.userService.search(
            data,
        );
        const user: User[] = await this.userService.getAll(skip, limit, search);
        return this.apiResponseService.response(
            200,
            this.languageService.get('user.getAll.success'),
            user,
        );
    }

    @Get('/:id')
    async getOneById(@Param('id') id: string): Promise<IApiResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }
        return this.apiResponseService.response(
            200,
            this.languageService.get('user.getById.success'),
            user,
        );
    }

    @Post('/store')
    async store(@Body() data: UserStore): Promise<IApiResponseSuccess> {
        const existEmail: Promise<User> = this.userService.getOneByEmail(
            data.email,
        );
        const existMobileNumber: Promise<User> = this.userService.getOneByMobileNumber(
            data.mobileNumber,
        );

        return Promise.all([existEmail, existMobileNumber])
            .then(async ([userExistEmail, userExistMobileNumber]) => {
                const errors: IApiError[] = [];
                if (userExistEmail) {
                    errors.push({
                        statusCode: SystemErrorStatusCode.USER_EMAIL_EXIST,
                        field: 'email',
                    });
                }
                if (userExistMobileNumber) {
                    errors.push({
                        statusCode:
                            SystemErrorStatusCode.USER_MOBILE_NUMBER_EXIST,
                        field: 'mobileNumber',
                    });
                }

                if (errors.length > 0) {
                    throw this.errorService.apiError(
                        SystemErrorStatusCode.USER_EXIST,
                        errors,
                    );
                }
                const create: User = await this.userService.store(data);
                const user: User = await this.userService.getOneById(create.id);
                return this.apiResponseService.response(
                    201,
                    this.languageService.get('user.store.success'),
                    user,
                );
            })
            .catch(err => {
                throw err;
            });
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<IApiResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        await this.userService.destroy(id);
        return this.apiResponseService.response(
            200,
            this.languageService.get('user.destroy.success'),
        );
    }

    @Put('/update/:id')
    async update(
        @Param('id') id: string,
        @Body() data: UserUpdate,
    ): Promise<IApiResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        const update: User = await this.userService.update(id, data);
        return this.apiResponseService.response(
            200,
            this.languageService.get('user.update.success'),
            update,
        );
    }
}
