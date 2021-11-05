import {
    Controller,
    Param,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
    NotFoundException,
    InternalServerErrorException,
    BadRequestException
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { AuthJwtGuard, User } from 'src/auth/auth.decorator';
import { PaginationService } from 'src/pagination/pagination.service';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { UserDocument, IUserDocument } from './user.interface';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { IErrors } from 'src/error/error.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from './user.constant';
import { UserListValidation } from './validation/user.list.validation';

@Controller('/user')
export class UserController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly paginationService: PaginationService,
        private readonly userService: UserService
    ) {}

    @Get('/list')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @ResponsePaging('user.findAll')
    async findAll(
        @Query(RequestValidationPipe)
        { page, perPage, sort, search }: UserListValidation
    ): Promise<IResponsePaging> {
        const skip: number = await this.paginationService.skip(page, perPage);
        const find: Record<string, any> = {};

        if (search) {
            find['$or'] = [
                {
                    firstName: {
                        $regex: new RegExp(search),
                        $options: 'i'
                    },
                    lastName: {
                        $regex: new RegExp(search),
                        $options: 'i'
                    },
                    email: {
                        $regex: new RegExp(search),
                        $options: 'i'
                    },
                    mobileNumber: search
                }
            ];
        }
        const users: UserDocument[] = await this.userService.findAll<UserDocument>(
            find,
            {
                limit: perPage,
                skip: skip,
                sort
            }
        );
        const totalData: number = await this.userService.getTotalData(find);
        const totalPage: number = await this.paginationService.totalPage(
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
    async profile(@User('_id') _id: string): Promise<IResponse> {
        const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
            _id,
            {
                populate: true
            }
        );
        if (!user) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'profile'
            });

            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound'
            });
        }

        return this.userService.mapProfile(user);
    }

    @Get('get/:_id')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @Response('user.findOneById')
    async findOneById(@Param('_id') _id: string): Promise<IResponse> {
        const user: IUserDocument = await this.userService.findOneById<IUserDocument>(
            _id,
            {
                populate: true
            }
        );
        if (!user) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'findOneById'
            });

            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound'
            });
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

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.createError',
                errors
            });
        }

        try {
            const create = await this.userService.create(data);

            return {
                _id: create._id
            };
        } catch (err: any) {
            this.debuggerService.error('create try catch', {
                class: 'UserController',
                function: 'create',
                error: err
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }

    @Delete('/delete/:_id')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_DELETE)
    @Response('user.delete')
    async delete(@Param('_id') _id: string): Promise<void> {
        const check: UserDocument = await this.userService.findOneById<UserDocument>(
            _id
        );
        if (!check) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });

            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound'
            });
        }

        try {
            await this.userService.deleteOneById(_id);
            return;
        } catch (err) {
            this.debuggerService.error('delete try catch', {
                class: 'UserController',
                function: 'create',
                error: err
            });
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }

    @Put('/update/:_id')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_UPDATE)
    @Response('user.update')
    async update(
        @Param('_id') _id: string,
        @Body(RequestValidationPipe)
        data: UserUpdateValidation
    ): Promise<IResponse> {
        const check: UserDocument = await this.userService.findOneById<UserDocument>(
            _id
        );
        if (!check) {
            this.debuggerService.error('user Error', {
                class: 'UserController',
                function: 'delete'
            });

            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound'
            });
        }

        try {
            await this.userService.updateOneById(_id, data);

            return {
                _id
            };
        } catch (err: any) {
            this.debuggerService.error('update try catch', {
                class: 'UserController',
                function: 'update',
                error: {
                    ...err
                }
            });
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }
}
