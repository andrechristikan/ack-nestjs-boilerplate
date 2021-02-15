import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
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
    IUserSafe,
    IUserUpdate
} from 'user/user.interface';
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
import { Logger as LoggerService } from 'winston';
import { Logger } from 'logger/logger.decorator';

@Controller('api/user')
export class UserController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        @Pagination() private readonly paginationService: PaginationService,
        @Logger() private readonly logger: LoggerService,
        private readonly userService: UserService
    ) {}

    @AuthBasic()
    @Get('/')
    async findAll(
        @Query('page', new DefaultValuePipe(PAGE), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(LIMIT), ParseIntPipe) limit: number
    ): Promise<IResponseSuccess> {
        const { skip } = await this.paginationService.pagination(page, limit);
        const user: IUser[] = await this.userService.findAll(skip, limit);
        const userSafe: IUserSafe[] = await this.userService.transformerMany(
            user
        );

        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            userSafe
        );
    }

    @AuthJwt()
    @Get('/profile')
    async profile(@User('id') userId: string): Promise<IResponseSuccess> {
        const user: IUser = await this.userService.findOneById(userId);
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'profile'
            });

            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const userSafe: IUserSafe = await this.userService.transformer(user);
        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            userSafe
        );
    }

    @AuthBasic()
    @Get('/in/:userId')
    async findOneById(
        @Param('userId') userId: string
    ): Promise<IResponseSuccess> {
        const user: IUser = await this.userService.findOneById(userId);
        if (!user) {
            this.logger.error('user Errors', {
                class: 'UserController',
                function: 'findOneById'
            });

            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const userSafe: IUserSafe = await this.userService.transformer(user);
        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            userSafe
        );
    }

    @AuthJwt()
    @Post('/create')
    async create(
        @Body(RequestValidationPipe(UserCreateValidation)) data: IUserCreate
    ): Promise<IResponseSuccess> {
        const existEmail: Promise<IUser> = this.userService.findOneByEmail(
            data.email
        );
        const existMobileNumber: Promise<IUser> = this.userService.findOneByMobileNumber(
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

                    this.logger.error('create errors', {
                        class: 'UserController',
                        function: 'create',
                        errors
                    });
                    const response: IResponseError = this.responseService.error(
                        AppErrorStatusCode.REQUEST_ERROR,
                        message
                    );

                    throw response;
                }

                try {
                    const user: UserEntity = await this.userService.create(
                        data
                    );

                    const userSafe: IUserSafe = await this.userService.transformer(
                        user.toObject() as IUser
                    );
                    return this.responseService.success(
                        AppSuccessStatusCode.USER_CREATE,
                        userSafe
                    );
                } catch (errCreate) {
                    this.logger.error('create try catch', {
                        class: 'UserController',
                        function: 'create',
                        error: {
                            ...errCreate
                        }
                    });

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
        const user: IUser = await this.userService.findOneById(userId);
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });

            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        await this.userService.deleteOneById(userId);
        const userSafe: IUserSafe = await this.userService.transformer(user);
        return this.responseService.success(
            AppSuccessStatusCode.USER_DELETE,
            userSafe
        );
    }

    @AuthJwt()
    @Put('/update/:userId')
    async update(
        @Param('userId') userId: string,
        @Body(RequestValidationPipe(UserUpdateValidation)) data: IUserUpdate
    ): Promise<IResponseSuccess> {
        const checkUser: IUser = await this.userService.findOneById(userId);
        if (!checkUser) {
            this.logger.error('checkUser Error', {
                class: 'UserController',
                function: 'update'
            });

            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        try {
            const user: UserEntity = await this.userService.updateOneById(
                userId,
                data
            );
            const userSafe: IUserSafe = await this.userService.transformer(
                user.toObject() as IUser
            );
            return this.responseService.success(
                AppSuccessStatusCode.USER_UPDATE,
                userSafe
            );
        } catch (err) {
            this.logger.error('update try catch', {
                class: 'UserController',
                function: 'update',
                error: {
                    ...err
                }
            });

            const response: IResponseError = this.responseService.error(
                AppErrorStatusCode.GENERAL_ERROR
            );
            throw new InternalServerErrorException(response);
        }
    }
}
