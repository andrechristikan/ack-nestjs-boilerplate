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
    NotFoundException
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RequestValidationPipe } from 'src/request/pipe/request.validation.pipe';
import { UserCreateValidation } from 'src/user/validation/user.create.validation';
import { UserUpdateValidation } from 'src/user/validation/user.update.validation';
import { AuthJwtGuard } from 'src/auth/auth.decorator';
import { PaginationService } from 'src/pagination/pagination.service';
import { Logger as DebuggerService } from 'winston';
import { Debugger } from 'src/debugger/debugger.decorator';
import { IUserCheckExist, IUserDocument } from './user.interface';
import { ENUM_PERMISSIONS } from 'src/permission/permission.constant';
import { IResponse, IResponsePaging } from 'src/response/response.interface';
import { Response, ResponsePaging } from 'src/response/response.decorator';
import { ENUM_STATUS_CODE_ERROR } from 'src/error/error.constant';
import { IErrors } from 'src/error/error.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from './user.constant';
import { UserListValidation } from './validation/user.list.validation';
import { GetUser, UserGetGuard, UserProfileGuard } from './user.decorator';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';
import { Image } from 'src/helper/helper.decorator';
import { AwsService } from 'src/aws/aws.service';
import { IAwsResponse } from 'src/aws/aws.interface';
import { ConfigService } from '@nestjs/config';
import { UserListTransformer } from './transformer/user.list.transformer';
import { UserSignUpValidation } from './validation/user.sign-up.validation';
import { RoleService } from 'src/role/role.service';
import { RoleDocument } from 'src/role/role.interface';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';

@Controller('/user')
export class UserController {
    constructor(
        @Debugger() private readonly debuggerService: DebuggerService,
        @Message() private readonly messageService: MessageService,
        private readonly paginationService: PaginationService,
        private readonly userService: UserService
    ) {}

    @ResponsePaging('user.list')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ)
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
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ)
    @Get('get/:user')
    async get(@GetUser() user: IUserDocument): Promise<IResponse> {
        return this.userService.mapGet(user);
    }

    @Response('user.create')
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_CREATE)
    @Post('/create')
    async create(
        @Body(RequestValidationPipe)
        data: UserCreateValidation
    ): Promise<IResponse> {
        const checkExist: IUserCheckExist = await this.userService.checkExist(
            data.email,
            data.mobileNumber
        );

        const errors: IErrors[] = [];
        if (checkExist.email) {
            errors.push({
                message: this.messageService.get('user.error.emailExist'),
                property: 'email'
            });
        }
        if (checkExist.mobileNumber) {
            errors.push({
                message: this.messageService.get(
                    'user.error.mobileNumberExist'
                ),
                property: 'mobileNumber'
            });
        }

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

    @Response('user.delete')
    @UserGetGuard()
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_DELETE)
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
    @UserGetGuard()
    @AuthJwtGuard(ENUM_PERMISSIONS.USER_READ, ENUM_PERMISSIONS.USER_UPDATE)
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
        @Message() private readonly messageService: MessageService,
        private readonly userService: UserService,
        private readonly awsService: AwsService,
        private readonly configService: ConfigService,
        private readonly roleService: RoleService
    ) {}

    @Response('user.signUp')
    @Post('/sign-up')
    async signUp(
        @Body(RequestValidationPipe)
        { email, mobileNumber, ...body }: UserSignUpValidation
    ): Promise<IResponse> {
        const role: RoleDocument = await this.roleService.findOne<RoleDocument>(
            {
                name: 'user'
            }
        );
        if (!role) {
            this.debuggerService.error('Role not found', {
                class: 'UserPublicController',
                function: 'signUp'
            });

            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound'
            });
        }

        const checkExist: IUserCheckExist = await this.userService.checkExist(
            email,
            mobileNumber
        );

        const errors: IErrors[] = [];
        if (checkExist.email) {
            errors.push({
                message: this.messageService.get('user.error.emailExist'),
                property: 'email'
            });
        }
        if (checkExist.mobileNumber) {
            errors.push({
                message: this.messageService.get(
                    'user.error.mobileNumberExist'
                ),
                property: 'mobileNumber'
            });
        }

        if (errors.length > 0) {
            this.debuggerService.error('create errors', {
                class: 'UserPublicController',
                function: 'signUp',
                errors
            });

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.createError',
                errors
            });
        }

        try {
            const create = await this.userService.create({
                ...body,
                email,
                mobileNumber,
                role: role._id
            });

            return {
                _id: create._id
            };
        } catch (err: any) {
            this.debuggerService.error('Signup try catch', {
                class: 'UserPublicController',
                function: 'signUp',
                error: err
            });

            throw new InternalServerErrorException({
                statusCode: ENUM_STATUS_CODE_ERROR.UNKNOWN_ERROR,
                message: 'http.server.internalServerError'
            });
        }
    }

    @Response('user.profile')
    @UserProfileGuard()
    @AuthJwtGuard()
    @Get('/profile')
    async profile(@GetUser() user: IUserDocument): Promise<IResponse> {
        return this.userService.mapProfile(user);
    }

    @Response('user.upload')
    @UserProfileGuard()
    @AuthJwtGuard()
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

            const uploadPath: string = this.configService.get<string>(
                'user.uploadPath'
            );

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
