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
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { RequestValidationPipe } from 'src/pipe/request-validation.pipe';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { AuthJwtGuard, User } from 'src/auth/auth.decorator';
import { IErrors } from 'src/message/message.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { PaginationService } from 'src/pagination/pagination.service';
import { Pagination } from 'src/pagination/pagination.decorator';
import {
    DEFAULT_PAGE,
    DEFAULT_PER_PAGE
} from 'src/pagination/pagination.constant';
import { Logger as LoggerService } from 'winston';
import { Logger } from 'src/logger/logger.decorator';
import { UserDocument, UserDocumentFull } from './user.interface';
import { PermissionList } from 'src/permission/permission.constant';
import { Permissions } from 'src/permission/permission.decorator';
import { UserTransformer } from './transformer/user.transformer';
import { IResponse, IResponsePaging } from 'src/response/response.interface';

@Controller('/user')
export class UserController {
    constructor(
        @Message() private readonly messageService: MessageService,
        @Pagination() private readonly paginationService: PaginationService,
        @Logger() private readonly logger: LoggerService,
        private readonly userService: UserService
    ) {}

    @Get('/')
    @AuthJwtGuard()
    @ResponsePaging('user.findAll')
    @Permissions(PermissionList.UserRead)
    async findAll(
        @Query('page', new DefaultValuePipe(DEFAULT_PAGE), ParseIntPipe)
        page: number,
        @Query('perPage', new DefaultValuePipe(DEFAULT_PER_PAGE), ParseIntPipe)
        perPage: number
    ): Promise<IResponsePaging> {
        const skip = await this.paginationService.skip(page, perPage);
        const users: UserDocument[] = await this.userService.findAll<UserDocument>(
            {},
            {
                limit: perPage,
                skip: skip
            }
        );
        const totalData: number = await this.userService.totalData();
        const totalPage = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            data: users
        };
    }

    @Get('/profile')
    @AuthJwtGuard()
    @Response('user.profile')
    @Permissions(PermissionList.ProfileRead)
    async profile(@User('_id') userId: string): Promise<IResponse> {
        const user: UserDocumentFull = await this.userService.findOneById<UserDocumentFull>(
            userId,
            true
        );
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'profile'
            });

            throw new BadRequestException(
                this.messageService.get('http.clientError.notFound')
            );
        }

        return this.userService.safe(user);
    }

    @Get('/:userId')
    @AuthJwtGuard()
    @Response('user.findOneById')
    @Permissions(PermissionList.UserRead)
    async findOneById(@Param('userId') userId: string): Promise<IResponse> {
        const user: UserDocumentFull = await this.userService.findOneById<UserDocumentFull>(
            userId,
            true
        );
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'findOneById'
            });

            throw new BadRequestException(
                this.messageService.get('http.clientError.notFound')
            );
        }

        return user;
    }

    @Post('/create')
    @AuthJwtGuard()
    @Response('user.create')
    @Permissions(PermissionList.UserRead, PermissionList.UserCreate)
    async create(
        @Body(RequestValidationPipe(UserCreateValidation))
        data: Record<string, any>
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

            throw new BadRequestException(
                errors,
                this.messageService.get('user.error.createError')
            );
        }

        try {
            const create = await this.userService.create(data);
            const user: UserDocumentFull = await this.userService.findOneById<UserDocumentFull>(
                create._id,
                true
            );

            return user;
        } catch (err: any) {
            this.logger.error('create try catch', {
                class: 'UserController',
                function: 'create',
                error: err
            });
            throw new InternalServerErrorException(
                this.messageService.get('http.serverError.internalServerError')
            );
        }
    }

    @Delete('/delete/:userId')
    @AuthJwtGuard()
    @Response('user.delete')
    @Permissions(PermissionList.UserRead, PermissionList.UserDelete)
    async delete(@Param('userId') userId: string): Promise<void> {
        const user: UserDocumentFull = await this.userService.findOneById<UserDocumentFull>(
            userId,
            true
        );
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });

            throw new BadRequestException(
                this.messageService.get('http.clientError.notFound')
            );
        }

        const del: boolean = await this.userService.deleteOneById(userId);

        if (!del) {
            throw new InternalServerErrorException(
                this.messageService.get('http.serverError.internalServerError')
            );
        }

        return;
    }

    @Put('/update/:userId')
    @AuthJwtGuard()
    @Response('user.update')
    @Permissions(PermissionList.UserRead, PermissionList.UserUpdate)
    async update(
        @Param('userId') userId: string,
        @Body(RequestValidationPipe(UserUpdateValidation))
        data: UserUpdateValidation
    ): Promise<IResponse> {
        const user: UserDocumentFull = await this.userService.findOneById<UserDocumentFull>(
            userId,
            true
        );
        if (!user) {
            this.logger.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });
            throw new BadRequestException(
                this.messageService.get('http.clientError.notFound')
            );
        }

        try {
            await this.userService.updateOneById(userId, data);
            const user: UserDocumentFull = await this.userService.findOneById<UserDocumentFull>(
                userId,
                true
            );

            return user;
        } catch (err: any) {
            this.logger.error('update try catch', {
                class: 'UserController',
                function: 'update',
                error: {
                    ...err
                }
            });

            throw new InternalServerErrorException(
                this.messageService.get('http.serverError.internalServerError')
            );
        }
    }
}
