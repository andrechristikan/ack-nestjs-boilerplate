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
import { UserStore, UserUpdate, UserSearch } from 'user/user.constant';
import { HelperService } from 'helper/helper.service';
import { ResponseSuccess } from 'helper/helper.constant';

@Controller('api/user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly errorService: ErrorService,
        private readonly helperService: HelperService,
    ) {}

    @Get('/')
    async getAll(@Query() data: UserSearch): Promise<ResponseSuccess> {
        const { skip, limit } = this.helperService.paging(
            data.page,
            data.limit,
        );

        const search: UserSearch = await this.userService.search(data);
        const user: User[] = await this.userService.getAll(skip, limit, search);
        return this.helperService.response(200, 'All user', user);
    }

    @Get('/:id')
    async getOneById(@Param('id') id: string): Promise<ResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }
        return this.helperService.response(200, 'Get user', user);
    }

    @Post('/store')
    async store(@Body() data: UserStore): Promise<ResponseSuccess> {
        const existEmail: Promise<User> = this.userService.getOneByEmail(
            data.email,
        );
        const existMobileNumber: Promise<User> = this.userService.getOneByMobileNumber(
            data.mobileNumber,
        );

        return Promise.all([existEmail, existMobileNumber])
            .then(async ([userExistEmail, userExistMobileNumber]) => {
                const errors: Array<Record<string, any>> = [];
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
                return this.helperService.response(201, 'Create user', user);
            })
            .catch(err => {
                throw err;
            });
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<ResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        await this.userService.destroy(id);
        return this.helperService.response(200, 'Delete user');
    }

    @Put('/update/:id')
    async update(
        @Param('id') id: string,
        @Body() data: UserUpdate,
    ): Promise<ResponseSuccess> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        const update: User = await this.userService.update(id, data);
        return this.helperService.response(200, 'Update user', update);
    }
}
