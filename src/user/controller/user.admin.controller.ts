import {
    Controller,
    Get,
    Post,
    Body,
    Delete,
    Put,
    Query,
    InternalServerErrorException,
    BadRequestException,
    Patch,
    NotFoundException,
} from '@nestjs/common';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import {
    GetUser,
    UserDeleteGuard,
    UserGetGuard,
    UserUpdateActiveGuard,
    UserUpdateGuard,
    UserUpdateInactiveGuard,
} from '../user.decorator';
import { AuthAdminJwtGuard } from 'src/auth/auth.decorator';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { UserService } from '../service/user.service';
import { RoleService } from 'src/role/service/role.service';
import { UserListValidation } from '../validation/user.list.validation';
import { IUserCheckExist, IUserDocument } from '../user.interface';
import { UserListTransformer } from '../transformer/user.list.transformer';
import { ENUM_USER_STATUS_CODE_ERROR } from '../user.constant';
import { PaginationService } from 'src/utils/pagination/service/pagination.service';
import { AuthService } from 'src/auth/service/auth.service';
import {
    Response,
    ResponsePaging,
} from 'src/utils/response/response.decorator';
import { RequestValidationPipe } from 'src/utils/request/pipe/request.validation.pipe';
import {
    IResponse,
    IResponsePaging,
} from 'src/utils/response/response.interface';
import { ENUM_STATUS_CODE_ERROR } from 'src/utils/error/error.constant';
import { DebuggerService } from 'src/debugger/service/debugger.service';

@Controller({
    version: '1',
    path: 'user',
})
export class UserAdminController {
    constructor(
        private readonly debuggerService: DebuggerService,
        private readonly authService: AuthService,
        private readonly paginationService: PaginationService,
        private readonly userService: UserService,
        private readonly roleService: RoleService
    ) {}

    @ResponsePaging('user.list')
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @Get('/list')
    async list(
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
                        $options: 'i',
                    },
                    lastName: {
                        $regex: new RegExp(search),
                        $options: 'i',
                    },
                    email: {
                        $regex: new RegExp(search),
                        $options: 'i',
                    },
                    mobileNumber: search,
                },
            ];
        }
        const users: IUserDocument[] = await this.userService.findAll(find, {
            limit: perPage,
            skip: skip,
            sort,
        });
        const totalData: number = await this.userService.getTotal(find);
        const totalPage: number = await this.paginationService.totalPage(
            totalData,
            perPage
        );

        const data: UserListTransformer[] = await this.userService.mapList(
            users
        );

        return {
            totalData,
            totalPage,
            currentPage: page,
            perPage,
            data,
        };
    }

    @Response('user.get')
    @UserGetGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @Get('get/:user')
    async get(@GetUser() user: IUserDocument): Promise<IResponse> {
        return this.userService.mapGet(user);
    }

    @Response('user.create')
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_CREATE)
    @Post('/create')
    async create(
        @Body(RequestValidationPipe)
        body: UserCreateValidation
    ): Promise<IResponse> {
        const checkExist: IUserCheckExist = await this.userService.checkExist(
            body.email,
            body.mobileNumber
        );

        if (checkExist.email && checkExist.mobileNumber) {
            this.debuggerService.error(
                'create user exist',
                'UserController',
                'create'
            );

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.exist',
            });
        } else if (checkExist.email) {
            this.debuggerService.error(
                'create user exist',
                'UserController',
                'create'
            );

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (checkExist.mobileNumber) {
            this.debuggerService.error(
                'create user exist',
                'UserController',
                'create'
            );

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        const role = await this.roleService.findOneById(body.role);
        if (!role) {
            this.debuggerService.error(
                'Role not found',
                'UserController',
                'create'
            );

            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        }

        try {
            const password = await this.authService.createPassword(
                body.password
            );

            const create = await this.userService.create({
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                mobileNumber: body.mobileNumber,
                role: body.role,
                password: password.passwordHash,
                passwordExpiredDate: password.passwordExpiredDate,
                salt: password.salt,
            });

            return {
                _id: create._id,
            };
        } catch (err: any) {
            this.debuggerService.error(
                'create try catch',
                'UserController',
                'create',
                err
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }
    }

    @Response('user.delete')
    @UserDeleteGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_DELETE)
    @Delete('/delete/:user')
    async delete(@GetUser() user: IUserDocument): Promise<void> {
        try {
            await this.userService.deleteOneById(user._id);
        } catch (err) {
            this.debuggerService.error(
                'delete try catch',
                'UserController',
                'create',
                err
            );
            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return;
    }

    @Response('user.update')
    @UserUpdateGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_UPDATE)
    @Put('/update/:user')
    async update(
        @GetUser() user: IUserDocument,
        @Body(RequestValidationPipe)
        body: UserUpdateValidation
    ): Promise<IResponse> {
        try {
            await this.userService.updateOneById(user._id, body);
        } catch (err: any) {
            this.debuggerService.error(
                'update try catch',
                'UserController',
                'update',
                err
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return {
            _id: user._id,
        };
    }

    @Response('user.inactive')
    @UserUpdateInactiveGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_UPDATE)
    @Patch('/update/:user/inactive')
    async inactive(@GetUser() user: IUserDocument): Promise<void> {
        try {
            await this.userService.inactive(user._id);
        } catch (e) {
            this.debuggerService.error(
                'User inactive server internal error',
                'UserController',
                'inactive',
                e
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return;
    }

    @Response('user.active')
    @UserUpdateActiveGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_UPDATE)
    @Patch('/update/:user/active')
    async active(@GetUser() user: IUserDocument): Promise<void> {
        try {
            await this.userService.active(user._id);
        } catch (e) {
            this.debuggerService.error(
                'User active server internal error',
                'UserController',
                'active',
                e
            );

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError',
            });
        }

        return;
    }
}
