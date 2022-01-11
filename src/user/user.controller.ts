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
    HttpCode,
    HttpStatus,
    UploadedFile,
    forwardRef,
    Inject
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { PaginationService } from 'src/pagination/pagination.service';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { IUserCheckExist, IUserDocument } from './user.interface';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from './user.constant';
import { UserListValidation } from './validation/user.list.validation';
import {
    GetUser,
    UserDeleteGuard,
    UserGetGuard,
    UserProfileGuard,
    UserUpdateGuard
} from './user.decorator';
import { Image } from 'src/helper/helper.decorator';
import { AwsService } from 'src/aws/aws.service';
import { IAwsResponse } from 'src/aws/aws.interface';
import { ConfigService } from '@nestjs/config';
import { UserListTransformer } from './transformer/user.list.transformer';
import { AuthAdminJwtGuard, AuthPublicJwtGuard } from 'src/auth/auth.decorator';
import { AuthService } from 'src/auth/auth.service';

@Controller('/user')
export class UserAdminController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        @Inject(forwardRef(() => AuthService))
        private readonly authService: AuthService,
        private readonly paginationService: PaginationService,
        private readonly userService: UserService
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
        const users: IUserDocument[] = await this.userService.findAll(find, {
            limit: perPage,
            skip: skip,
            sort
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
            data
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
            this.debuggerService.error('create user exist', {
                class: 'UserController',
                function: 'create'
            });

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.exist'
            });
        } else if (checkExist.email) {
            this.debuggerService.error('create user exist', {
                class: 'UserController',
                function: 'create'
            });

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist'
            });
        } else if (checkExist.mobileNumber) {
            this.debuggerService.error('create user exist', {
                class: 'UserController',
                function: 'create'
            });

            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist'
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
                passwordExpired: password.passwordExpired,
                salt: password.salt
            });

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

    @Response('user.delete')
    @UserDeleteGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_DELETE)
    @Delete('/delete/:user')
    async delete(@GetUser() user: IUserDocument): Promise<void> {
        try {
            await this.userService.deleteOneById(user._id);

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

    @Response('user.update')
    @UserUpdateGuard()
    @AuthAdminJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_UPDATE)
    @Put('/update/:user')
    async update(
        @GetUser() user: IUserDocument,
        @Body(RequestValidationPipe)
        data: UserUpdateValidation
    ): Promise<IResponse> {
        try {
            await this.userService.updateOneById(user._id, data);

            return {
                _id: user._id
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

@Controller('/user')
export class UserPublicController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        private readonly userService: UserService,
        private readonly awsService: AwsService,
        private readonly configService: ConfigService
    ) {}

    @Response('user.profile')
    @UserProfileGuard()
    @AuthPublicJwtGuard()
    @Get('/profile')
    async profile(@GetUser() user: IUserDocument): Promise<IResponse> {
        return this.userService.mapProfile(user);
    }

    @Response('user.upload')
    @UserProfileGuard()
    @AuthPublicJwtGuard()
    @Image('file')
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload')
    async upload(
        @GetUser() user: IUserDocument,
        @UploadedFile() file: Express.Multer.File
    ): Promise<void> {
        try {
            const filename: string = file.originalname;
            const content: Buffer = file.buffer;
            const mime: string = filename
                .substring(filename.lastIndexOf('.') + 1, filename.length)
                .toUpperCase();

            const uploadPath: string =
                this.configService.get<string>('user.uploadPath');

            const aws: IAwsResponse = await this.awsService.s3PutItemInBucket(
                `${await this.userService.createRandomFilename()}.${mime}`,
                content,
                {
                    path: `${uploadPath}/${user._id}`
                }
            );

            await this.userService.updatePhoto(user._id, aws);
            return;
        } catch (err) {
            this.debuggerService.error('Store photo user', {
                class: 'UserPublicController',
                function: 'upload',
                error: err
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.serverError.internalServerError'
            });
        }
    }
}
