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
    ParseIntPipe
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RequestValidationPipe } from 'src/pipe/request-validation.pipe';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { AuthJwtGuard, User } from 'src/auth/auth.decorator';
import { IErrors } from 'src/message/message.interface';
import { PaginationService } from 'src/pagination/pagination.service';
import {
    DEFAULT_PAGE,
    DEFAULT_PER_PAGE
} from 'src/pagination/pagination.constant';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { UserDocument, IUserDocument } from './user.interface';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { CustomHttpException } from 'src/response/response.filter';
import { ENUM_RESPONSE_STATUS_CODE } from 'src/response/response.constant';

@Controller('/user')
export class UserController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly paginationService: PaginationService,
        private readonly userService: UserService
    ) {}

    @Get('/')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @ResponsePaging('user.findAll')
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
        const totalData: number = await this.userService.getTotalData();
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
    @AuthJwtGuard(ENUM_PERMISSIONS.PROFILE_READ)
    @Response('user.profile')
    async profile(@User('_id') userId: string): Promise<IResponse> {
        const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
            userId,
            true
        );
        if (!user) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'profile'
            });

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.USER_NOT_FOUND_ERROR
            );
        }

        return this.userService.mapProfile(user);
    }

    @Get('/:userId')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @Response('user.findOneById')
    async findOneById(@Param('userId') userId: string): Promise<IResponse> {
        const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
            userId,
            true
        );
        if (!user) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'findOneById'
            });

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.USER_NOT_FOUND_ERROR
            );
        }

        return user;
    }

    @Post('/create')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_CREATE)
    @Response('user.create')
    async create(
        @Body(RequestValidationPipe)
        data: UserCreateValidation
    ): Promise<IResponse> {
        const errors: IErrors[] = await this.userService.checkExist(
            data.email,
            data.mobileNumber
        );

        if (errors.length > 0) {
            this.debuggerService.error('create errors', {
                class: 'UserController',
                function: 'create',
                errors
            });

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.USER_EXISTS_ERROR
            );
        }

        try {
            const create = await this.userService.create(data);
            const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
                create._id,
                true
            );

            return user;
        } catch (err: any) {
            this.debuggerService.error('create try catch', {
                class: 'UserController',
                function: 'create',
                error: err
            });

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.UNKNOWN_ERROR
            );
        }
    }

    @Delete('/delete/:userId')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_DELETE)
    @Response('user.delete')
    async delete(@Param('userId') userId: string): Promise<void> {
        const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
            userId,
            true
        );
        if (!user) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.USER_NOT_FOUND_ERROR
            );
        }

        const del: boolean = await this.userService.deleteOneById(userId);

        if (!del) {
            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.UNKNOWN_ERROR
            );
        }

        return;
    }

    @Put('/update/:userId')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_UPDATE)
    @Response('user.update')
    async update(
        @Param('userId') userId: string,
        @Body(RequestValidationPipe)
        data: UserUpdateValidation
    ): Promise<IResponse> {
        const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
            userId,
            true
        );
        if (!user) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });
            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.USER_NOT_FOUND_ERROR
            );
        }

        try {
            await this.userService.updateOneById(userId, data);
            const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
                userId,
                true
            );

            return user;
        } catch (err: any) {
            this.debuggerService.error('update try catch', {
                class: 'UserController',
                function: 'update',
                error: {
                    ...err
                }
            });

            throw new CustomHttpException(
                ENUM_RESPONSE_STATUS_CODE.UNKNOWN_ERROR
            );
        }
    }
}
