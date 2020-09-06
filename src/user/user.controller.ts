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
import {
    User,
    UserStoreFillableFields,
    UserUpdateFillableFields,
} from 'user/user.model';
import { HelperService } from 'helper/helper.service';

@Controller('api/user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly errorService: ErrorService,
        private readonly helperService: HelperService,
    ) {}

    @Get('/')
    async getAll(@Query() data: Record<string, any>): Promise<User[]> {
        const { skip, limit } = this.helperService.paging(
            data.page,
            data.limit,
        );

        const user: User[] = await this.userService.getAll(skip, limit);
        return user;
    }

    @Get('/:id')
    async getOneById(@Param('id') id: string): Promise<User> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }
        return user;
    }

    @Post('/store')
    async store(@Body() data: UserStoreFillableFields): Promise<User> {
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

                return create;
            })
            .catch(err => {
                throw err;
            });
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<User> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        await this.userService.destroy(id);
        return user;
    }

    @Put('/update/:id')
    async update(
        @Param('id') id: string,
        @Body() data: UserUpdateFillableFields,
    ): Promise<User> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        const update: User = await this.userService.update(id, data);
        return update;
    }
}
