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
import { UserService } from 'src/user/user.service';
import { IUserCreate, IUserSafe, IUserUpdate } from 'src/user/user.interface';
import { Response } from 'src/response/response.decorator';
import { ResponseService } from 'src/response/response.service';
import {
    IResponseError,
    IResponseSuccess
} from 'src/response/response.interface';
import { AppErrorStatusCode } from 'src/status-code/status-code.error.constant';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { RequestValidationPipe } from 'src/pipe/request-validation.pipe';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { User } from 'src/user/user.decorator';
import { AuthBasic, AuthJwt } from 'src/auth/auth.decorator';
import { IErrors, IMessageErrors } from 'src/message/message.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { PaginationService } from 'src/pagination/pagination.service';
import { Pagination } from 'src/pagination/pagination.decorator';
import { PAGE, LIMIT } from 'src/pagination/pagination.constant';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from './user.schema';

@Controller('/user')
export class UserController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        @Pagination() private readonly paginationService: PaginationService,
        @Logger() private readonly logger: LoggerService,
        private readonly userService: UserService,
        private readonly configService: ConfigService
    ) {}

    @AuthBasic()
    @Get('/')
    async findAll(
        @Query('page', new DefaultValuePipe(PAGE), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(LIMIT), ParseIntPipe) limit: number
    ): Promise<IResponseSuccess> {
        const { skip } = await this.paginationService.pagination(page, limit);
        const user: UserEntity[] = await this.userService.findAll(skip, limit);
        const userSafe: IUserSafe[] = await this.userService.transformer<
            IUserSafe[],
            UserEntity[]
        >(user);

        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            userSafe
        );
    }

    @AuthJwt()
    @Get('/profile')
    async profile(@User('id') userId: string): Promise<IResponseSuccess> {
        const user: UserEntity = await this.userService.findOneById(userId);
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

        const userSafe: IUserSafe = await this.userService.transformer<
            IUserSafe,
            UserEntity
        >(user);
        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            userSafe
        );
    }

    @AuthBasic()
    @Get('/:userId')
    async findOneById(
        @Param('userId') userId: string
    ): Promise<IResponseSuccess> {
        const user: UserEntity = await this.userService.findOneById(userId);
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

        const userSafe: IUserSafe = await this.userService.transformer<
            IUserSafe,
            UserEntity
        >(user);
        return this.responseService.success(
            AppSuccessStatusCode.USER_GET,
            userSafe
        );
    }

    @AuthBasic()
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
                    const userSafe: IUserSafe = await this.userService.transformer<
                        IUserSafe,
                        UserEntity
                    >(user);
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

    @AuthBasic()
    @Delete('/delete/:userId')
    async delete(@Param('userId') userId: string): Promise<IResponseSuccess> {
        const user: UserEntity = await this.userService.findOneById(userId);
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
        return this.responseService.success(AppSuccessStatusCode.USER_DELETE);
    }

    @AuthBasic()
    @Put('/update/:userId')
    async update(
        @Param('userId') userId: string,
        @Body(RequestValidationPipe(UserUpdateValidation)) data: IUserUpdate
    ): Promise<IResponseSuccess> {
        const checkUser: UserEntity = await this.userService.findOneById(
            userId
        );
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
            await this.userService.updateOneById(userId, data);
            const user: UserEntity = await this.userService.findOneById(userId);
            const userSafe: IUserSafe = await this.userService.transformer<
                IUserSafe,
                UserEntity
            >(user);

            return this.responseService.success(
                AppSuccessStatusCode.USER_UPDATE,
                userSafe
            );
        } catch (err: any) {
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
