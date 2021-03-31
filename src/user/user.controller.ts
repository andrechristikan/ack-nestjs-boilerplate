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
import { IUser, IUserSafe } from 'src/user/user.interface';
import { Response } from 'src/response/response.decorator';
import { ResponseService } from 'src/response/response.service';
import { IResponse } from 'src/response/response.interface';
import { RequestValidationPipe } from 'src/pipe/request-validation.pipe';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { User } from 'src/user/user.decorator';
import { AuthBasic, AuthJwt } from 'src/auth/auth.decorator';
import { IErrors } from 'src/message/message.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { PaginationService } from 'src/pagination/pagination.service';
import { Pagination } from 'src/pagination/pagination.decorator';
import { PAGE, PER_PAGE } from 'src/pagination/pagination.constant';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { UserEntity } from 'src/user/user.schema';
import { response } from 'express';

@Controller('/user')
export class UserController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Message() private readonly messageService: MessageService,
        @Pagination() private readonly paginationService: PaginationService,
        @Logger() private readonly logger: LoggerService,
        private readonly userService: UserService
    ) {}

    @AuthJwt()
    @Get('/')
    async findAll(
        @Query('page', new DefaultValuePipe(PAGE), ParseIntPipe) page: number,
        @Query('perPage', new DefaultValuePipe(PER_PAGE), ParseIntPipe)
        perPage: number
    ): Promise<IResponse> {
        const skip = await this.paginationService.skip(page, perPage);
        const user: UserEntity[] = await this.userService.findAll(
            skip,
            perPage
        );
        const totalData: number = await this.userService.totalData();
        const totalPage = await this.paginationService.totalPage(
            totalData,
            perPage
        );
        const userSafe: IUserSafe[] = await this.userService.transformer<
            IUserSafe[],
            UserEntity[]
        >(user);

        return this.responseService.paging(
            this.messageService.get('user.findAll.success'),
            totalData,
            totalPage,
            page,
            perPage,
            userSafe
        );
    }

    @AuthJwt()
    @Get('/profile')
    async profile(@User('id') userId: string): Promise<IResponse> {
        const user: IUser = await this.userService.findOneById(userId);
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'profile'
            });
            const response: IResponse = this.responseService.error(
                this.messageService.get('http.clientError.notFound')
            );
            throw new BadRequestException(response);
        }

        const userSafe: IUserSafe = await this.userService.transformer<
            IUserSafe,
            UserEntity
        >(user.toObject());
        return this.responseService.success(
            this.messageService.get('user.profile.success'),
            userSafe
        );
    }

    @AuthJwt()
    @Get('/:userId')
    async findOneById(@Param('userId') userId: string): Promise<IResponse> {
        const user: IUser = await this.userService.findOneById(userId);
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'findOneById'
            });
            const response: IResponse = this.responseService.error(
                this.messageService.get('http.clientError.notFound')
            );
            throw new BadRequestException(response);
        }

        const userSafe: IUserSafe = await this.userService.transformer<
            IUserSafe,
            UserEntity
        >(user.toObject());
        return this.responseService.success(
            this.messageService.get('user.findOneById.success'),
            userSafe
        );
    }

    @AuthJwt()
    @Post('/create')
    async create(
        @Body(RequestValidationPipe(UserCreateValidation))
        data: UserCreateValidation
    ): Promise<IResponse> {
        const errors: IErrors[] = await this.userService.checkExist(
            data.email,
            data.mobileNumber
        );

        if (errors.length > 0) {
            this.logger.error('create errors', {
                class: 'UserController',
                function: 'create',
                errors
            });

            const response: IResponse = this.responseService.error(
                this.messageService.get('user.create.error'),
                errors
            );
            throw new BadRequestException(response);
        }

        try {
            const user: IUser = await this.userService.create(data);
            const userSafe: IUserSafe = await this.userService.transformer<
                IUserSafe,
                UserEntity
            >(user.toObject());

            return this.responseService.success(
                this.messageService.get('user.create.success'),
                userSafe
            );
        } catch (err: any) {
            this.logger.error('create try catch', {
                class: 'UserController',
                function: 'create',
                error: err
            });
            const response: IResponse = this.responseService.error(
                this.messageService.get('http.serverError.internalServerError')
            );
            throw new InternalServerErrorException(response);
        }
    }

    @AuthJwt()
    @Delete('/delete/:userId')
    async delete(@Param('userId') userId: string): Promise<IResponse> {
        const user: IUser = await this.userService.findOneById(userId);
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });
            const response: IResponse = this.responseService.error(
                this.messageService.get('http.clientError.notFound')
            );
            throw new BadRequestException(response);
        }

        await this.userService.deleteOneById(userId);
        return this.responseService.success(
            this.messageService.get('user.delete.success')
        );
    }

    @AuthJwt()
    @Put('/update/:userId')
    async update(
        @Param('userId') userId: string,
        @Body(RequestValidationPipe(UserUpdateValidation))
        data: UserUpdateValidation
    ): Promise<IResponse> {
        const user: IUser = await this.userService.findOneById(userId);
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });
            const response: IResponse = this.responseService.error(
                this.messageService.get('http.clientError.notFound')
            );
            throw new BadRequestException(response);
        }

        try {
            await this.userService.updateOneById(userId, data);
            const user: IUser = await this.userService.findOneById(userId);
            const userSafe: IUserSafe = await this.userService.transformer<
                IUserSafe,
                UserEntity
            >(user.toObject());

            return this.responseService.success(
                this.messageService.get('user.update.success'),
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

            const response: IResponse = this.responseService.error(
                this.messageService.get('http.serverError.internalServerError')
            );
            throw new InternalServerErrorException(response);
        }
    }
}
