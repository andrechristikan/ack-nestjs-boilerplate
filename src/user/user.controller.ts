import { Controller, Param, Get, Post, Body, Delete } from '@nestjs/common';
import { UserService } from 'user/user.service';
import { ErrorService } from 'error/error.service';
import { SystemErrorStatusCode } from 'error/error.constant';
import {
    UserFillableFields,
    UserFields,
    UserFullFields,
} from 'user/user.model';

@Controller('api/user')
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly errorService: ErrorService,
    ) {}

    @Get('/:id')
    async getById(@Param('id') id: string): Promise<UserFields> {
        const user: UserFullFields = (await this.userService.getById(
            id,
        )) as UserFullFields;
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }
        return this.userService.filterUserField(user);
    }

    @Post('/store')
    async store(@Body() userData: UserFillableFields): Promise<UserFields> {
        const existEmail = this.userService.getByEmail(userData.email);
        const existMobileNumber = this.userService.getByEmail(userData.email);

        return Promise.all([existEmail, existMobileNumber])
            .then(async ([resExistEmail, resExistMobileNumber]) => {
                const errors = [];
                if (resExistEmail) {
                    errors.push({
                        statusCode: SystemErrorStatusCode.USER_EMAIL_EXIST,
                        field: 'email',
                    });
                }
                if (resExistMobileNumber) {
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
                const user: UserFullFields = (await this.userService.store(
                    userData,
                )) as UserFullFields;

                return this.userService.filterUserField(user);
            })
            .catch(err => {
                throw err;
            });
    }

    @Delete('/destroy/:id')
    async destroy(@Param('id') id: string): Promise<UserFields> {
        const user: UserFullFields = (await this.userService.getById(
            id,
        )) as UserFullFields;
        if (!user) {
            throw this.errorService.apiError(
                SystemErrorStatusCode.USER_NOT_FOUND,
            );
        }

        await this.userService.destroy(id);
        return this.userService.filterUserField(user);
    }
}
