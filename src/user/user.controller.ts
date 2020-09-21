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
import { ResponseService } from 'helper/response/response.service';
import { IResponseSuccess } from 'helper/response/response.interface';
import { IApiError } from 'error/error.interface';
import { LanguageService } from 'language/language.service';

@Controller('api/user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly errorService: ErrorService,
        private readonly responseService: ResponseService,
        private readonly languageService: LanguageService,
    ) {}

    @Get('/')
    async getAll(@Query() data: UserSearch): Promise<IResponseSuccess> {
        const { skip, limit } = this.responseService.pagination(
            data.page,
            data.limit,
        );

        const search: UserSearchCollection = await this.userService.search(
            data,
        );
        const user: User[] = await this.userService.getAll(skip, limit, search);
        return this.responseService.response(
            200,
            this.languageService.get('user.getAll.success'),
            user,
        );
    }

    @Get('/:id')
    async getOneById(@Param('id') id: string): Promise<IResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }
        return this.responseService.response(
            200,
            this.languageService.get('user.getById.success'),
            user,
        );
    }

    @Post('/store')
    async store(@Body() data: UserStore): Promise<IResponseSuccess> {
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
                return this.responseService.response(
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
    async destroy(@Param('id') id: string): Promise<IResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        await this.userService.destroy(id);
        return this.responseService.response(
            200,
            this.languageService.get('user.destroy.success'),
        );
    }

    @Put('/update/:id')
    async update(
        @Param('id') id: string,
        @Body() data: UserUpdate,
    ): Promise<IResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        const update: User = await this.userService.update(id, data);
        return this.responseService.response(
            200,
            this.languageService.get('user.update.success'),
            update,
        );
    }
}
