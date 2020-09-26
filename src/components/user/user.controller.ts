import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
    UsePipes
} from '@nestjs/common';
import { UserService } from 'components/user/user.service';
import { ErrorService } from 'error/error.service';
import { SystemErrorStatusCode } from 'error/error.constant';
import { User } from 'components/user/user.model';
import {
    UserStore,
    UserUpdate,
    UserSearch,
    UserSearchCollection
} from 'components/user/user.interface';
import { ResponseService } from 'response/response.service';
import { IApiResponseSuccess } from 'response/response.interface';
import { IApiError } from 'error/error.interface';
import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';
import { Response } from 'response/response.decorator';
import { Error } from 'error/error.decorator';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { UserSearchRequest } from 'components/user/validation/user.search';
import { UserStoreRequest } from 'components/user/validation/user.store';
import { UserUpdateRequest } from 'components/user/validation/user.update';

@Controller('api/user')
export class UserController {
    constructor(
        @Error() private readonly errorService: ErrorService,
        @Response() private readonly responseService: ResponseService,
        @Language() private readonly languageService: LanguageService,
        private readonly userService: UserService
    ) {}

    @Get('/')
    @UsePipes(RequestValidationPipe(UserSearchRequest))
    async getAll(@Query() data: UserSearch): Promise<IApiResponseSuccess> {
        const { skip, limit } = this.responseService.pagination(
            data.page,
            data.limit
        );

        const search: UserSearchCollection = await this.userService.search(
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
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            const res: IApiError = this.errorService.setError(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            return this.responseService.error(res);
        }
        return this.responseService.success(
            200,
            this.languageService.get('user.getById.success'),
            user
        );
    }

    @Post('/store')
    @UsePipes(RequestValidationPipe(UserStoreRequest))
    async store(@Body() data: UserStore): Promise<IApiResponseSuccess> {
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
                    const res: IApiError = this.errorService.setError(
                        SystemErrorStatusCode.USER_EXIST,
                        errors
                    );
                    return this.responseService.error(res);
                }
                const create: User = await this.userService.store(data);
                const user: User = await this.userService.getOneById(create.id);
                return this.responseService.success(
                    201,
                    this.languageService.get('user.store.success'),
                    user
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
            const res: IApiError = this.errorService.setError(
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

    @Put('/update/:id')
    @UsePipes(RequestValidationPipe(UserUpdateRequest))
    async update(
        @Param('id') id: string,
        @Body() data: UserUpdate
    ): Promise<IApiResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            const res: IApiError = this.errorService.setError(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            return this.responseService.error(res);
        }

        const update: User = await this.userService.update(id, data);
        return this.responseService.success(
            200,
            this.languageService.get('user.update.success'),
            update
        );
    }
}
