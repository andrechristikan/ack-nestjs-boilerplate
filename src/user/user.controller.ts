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
    UseGuards,
    BadRequestException,
    InternalServerErrorException
} from '@nestjs/common';
import { UserService } from 'user/user.service';
import { User } from 'user/user.schema';
import {
    IUserCreate,
    IUserUpdate,
    IUserSearch,
    IUserSearchFind
} from 'user/user.interface';
import { JwtGuard } from 'auth/guard/jwt/jwt.guard';
import { Response } from 'response/response.decorator';
import { ResponseService } from 'response/response.service';
import {
    IApiSuccessResponse,
    IApiErrorResponse,
    IApiErrorMessage,
    IApiErrors
} from 'response/response.interface';
import {
    SystemSuccessStatusCode,
    SystemErrorStatusCode
} from 'response/response.constant';
import { Helper } from 'helper/helper.decorator';
import { HelperService } from 'helper/helper.service';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { UserCreateValidation } from 'user/validation/user.store.validation';
import { UserSearchValidation } from 'user/validation/user.search.validation';
import { UserUpdateValidation } from 'user/validation/user.update.validation';

@Controller('api/user')
export class UserController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Helper() private readonly helperService: HelperService,
        private readonly userService: UserService
    ) {}

    @UseGuards(JwtGuard)
    @Get('/')
    async getAll(
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
        @Query(RequestValidationPipe(UserSearchValidation)) data: IUserSearch
    ): Promise<IApiSuccessResponse> {
        const { skip } = await this.helperService.pagination(page, limit);

        const search: IUserSearchFind = await this.userService.search(data);
        const user: User[] = await this.userService.getAll(skip, limit, search);
        return this.responseService.success(
            SystemSuccessStatusCode.USER_GET,
            user
        );
    }

    @UseGuards(JwtGuard)
    @Get('/:id')
    async getOneById(@Param('id') id: string): Promise<IApiSuccessResponse> {
        const checkUser: User = await this.userService.getOneById(id);
        if (!checkUser) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const { password, salt, ...user } = checkUser.toJSON();
        return this.responseService.success(
            SystemSuccessStatusCode.USER_GET,
            user
        );
    }

    @UseGuards(JwtGuard)
    @Post('/create')
    async create(
        @Body(RequestValidationPipe(UserCreateValidation)) data: IUserCreate
    ): Promise<IApiSuccessResponse> {
        const existEmail: Promise<User> = this.userService.getOneByEmail(
            data.email
        );
        const existMobileNumber: Promise<User> = this.userService.getOneByMobileNumber(
            data.mobileNumber
        );

        return Promise.all([existEmail, existMobileNumber])
            .then(async ([userExistEmail, userExistMobileNumber]) => {
                const errors: IApiErrors[] = [];
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
                    const message: IApiErrorMessage[] = this.responseService.setErrorMessage(
                        errors
                    );
                    const response: IApiErrorResponse = this.responseService.error(
                        SystemErrorStatusCode.REQUEST_ERROR,
                        message
                    );

                    throw response;
                }

                try {
                    const { password, salt, ...user }: User = (
                        await this.userService.create(data)
                    ).toJSON();

                    return this.responseService.success(
                        SystemSuccessStatusCode.USER_CREATE,
                        user
                    );
                } catch (errCreate) {
                    const response: IApiErrorResponse = this.responseService.error(
                        SystemErrorStatusCode.GENERAL_ERROR
                    );
                    throw response;
                }
            })
            .catch(err => {
                throw new BadRequestException(err);
            });
    }

    @UseGuards(JwtGuard)
    @Delete('/delete/:id')
    async delete(@Param('id') id: string): Promise<IApiSuccessResponse> {
        const user: User = await this.userService.getOneById(id);
        if (!user) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        await this.userService.delete(id);
        return this.responseService.success(
            SystemSuccessStatusCode.USER_DELETE,
            user
        );
    }

    @UseGuards(JwtGuard)
    @Put('/update/:id')
    async update(
        @Param('id') id: string,
        @Body(RequestValidationPipe(UserUpdateValidation)) data: IUserUpdate
    ): Promise<IApiSuccessResponse> {
        const checkUser: User = await this.userService.getOneById(id);
        if (!checkUser) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        try {
            const { password, salt, ...user }: User = (
                await this.userService.update(id, data)
            ).toJSON();

            return this.responseService.success(
                SystemSuccessStatusCode.USER_UPDATE,
                user
            );
        } catch (err) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.GENERAL_ERROR
            );
            throw new InternalServerErrorException(response);
        }
    }
}
