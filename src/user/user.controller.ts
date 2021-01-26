import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
    UseGuards,
    BadRequestException,
    InternalServerErrorException,
    DefaultValuePipe,
    ParseIntPipe
} from '@nestjs/common';
import { UserService } from 'user/user.service';
import { UserEntity } from 'user/user.schema';
import {
    IUser,
    IUserCreate,
    IUserUpdate
} from 'user/user.interface';
import { JwtGuard } from 'auth/guard/jwt/jwt.guard';
import { Response } from 'response/response.decorator';
import { ResponseService } from 'response/response.service';
import { IResponseError, IResponseSuccess } from 'response/response.interface';
import { AppErrorStatusCode } from 'status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { UserCreateValidation } from 'user/validation/user.create.validation';
import { UserUpdateValidation } from 'user/validation/user.update.validation';
import { User } from 'user/user.decorator';
import { AuthBasic, AuthJwt } from 'auth/auth.decorator';
import { IErrors, IMessageErrors } from 'message/message.interface';
import { MessageService } from 'message/message.service';
import { Message } from 'message/message.decorator';
import { PaginationService } from 'pagination/pagination.service';
import { Pagination } from 'pagination/pagination.decorator';
import { PAGE, LIMIT } from 'pagination/pagination.constant';

@Controller('api/user')
export class UserController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        @Pagination() private readonly paginationService: PaginationService,
        private readonly userService: UserService
    ) {}

    @AuthBasic()
    @Get('/')
    async getAll(
        @Query('page', new DefaultValuePipe(PAGE), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(LIMIT), ParseIntPipe) limit: number
    ): Promise<IResponseSuccess> {
        const { skip } = await this.paginationService.pagination(page, limit);
        const user: UserEntity[] = await this.userService.findAll(skip, limit);
        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            user
        );
    }

    @AuthBasic()
    @Get('/get/:userId')
    async getOneById(@Param('id') userId: string): Promise<IResponseSuccess> {
        const checkUser: UserEntity = await this.userService.findOneById(
            userId
        );
        if (!checkUser) {
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const { password, salt, ...user } = checkUser.toJSON();
        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            user
        );
    }

    @AuthJwt()
    @Post('/create')
    async create(
        @Body(RequestValidationPipe(UserCreateValidation)) data: IUserCreate
    ): Promise<IResponseSuccess> {
        const existEmail: Promise<UserEntity> = this.userService.findOneByEmail(
            data.email
        );
        const existMobileNumber: Promise<UserEntity> = this.userService.findOneByMobileNumber(
            data.mobileNumber
        );

        return Promise.all([existEmail, existMobileNumber])
            .then(async ([userExistEmail, userExistMobileNumber]) => {
                const errors: IErrors[] = [];
                if (userExistEmail) {
                    errors.push({
                        statusCode: AppErrorStatusCode.USER_EMAIL_EXIST,
                        property: 'email'
                    });
                }
                if (userExistMobileNumber) {
                    errors.push({
                        statusCode: AppErrorStatusCode.USER_MOBILE_NUMBER_EXIST,
                        property: 'mobileNumber'
                    });
                }

                if (errors.length > 0) {
                    const message: IMessageErrors[] = this.messageService.setErrors(
                        errors
                    );
                    const response: IResponseError = this.responseService.error(
                        AppErrorStatusCode.REQUEST_ERROR,
                        message
                    );

                    throw response;
                }

                try {
                    const user: IUser = (
                        await this.userService.create(data)
                    ).toJSON();

                    return this.responseService.success(
                        AppSuccessStatusCode.USER_CREATE,
                        user
                    );
                } catch (errCreate) {
                    const response: IResponseError = this.responseService.error(
                        AppErrorStatusCode.GENERAL_ERROR
                    );
                    throw response;
                }
            })
            .catch((err) => {
                throw new BadRequestException(err);
            });
    }

    @AuthJwt()
    @Delete('/delete/:userId')
    async delete(@Param('userId') userId: string): Promise<IResponseSuccess> {
        const user: UserEntity = await this.userService.findOneById(userId);
        if (!user) {
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        await this.userService.deleteOneById(userId);
        return this.responseService.success(
            AppSuccessStatusCode.USER_DELETE,
            user
        );
    }

    @AuthJwt()
    @Put('/update/:userId')
    async update(
        @Param('userId') userId: string,
        @Body(RequestValidationPipe(UserUpdateValidation)) data: IUserUpdate
    ): Promise<IResponseSuccess> {
        const checkUser: UserEntity = await this.userService.findOneById(
            userId
        );
        if (!checkUser) {
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        try {
            const { password, salt, ...user } = (
                await this.userService.updateOneById(userId, data)
            ).toJSON();

            return this.responseService.success(
                AppSuccessStatusCode.USER_UPDATE,
                user
            );
        } catch (err) {
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.GENERAL_ERROR
            );
            throw new InternalServerErrorException(response);
        }
    }

    @UseGuards(JwtGuard)
    @Get('/profile')
    async profile(@User('id') userId: string): Promise<IResponseSuccess> {
        const checkUser: UserEntity = await this.userService.findOneById(
            userId
        );
        if (!checkUser) {
            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const { password, salt, ...user } = checkUser.toJSON();
        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            user
        );
    }
}
