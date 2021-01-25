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
    InternalServerErrorException
} from '@nestjs/common';
import { UserService } from 'user/user.service';
import { UserEntity } from 'user/user.schema';
import {
    IUser,
    IUserCreate,
    IUserFind,
    IUserUpdate
} from 'user/user.interface';
import { JwtGuard } from 'auth/guard/jwt/jwt.guard';
import { Response } from 'response/response.decorator';
import { ResponseService } from 'response/response.service';
import {
    IApiSuccessResponse,
    IApiErrorResponse,
    IApiErrorMessage,
    IApiErrors
} from 'response/response.interface';
import {
    SystemSuccessStatusCode,
    SystemErrorStatusCode
} from 'response/response.constant';
import { Helper } from 'helper/helper.decorator';
import { HelperService } from 'helper/helper.service';
import { RequestValidationPipe } from 'pipe/request-validation.pipe';
import { UserCreateValidation } from 'user/validation/user.create.validation';
import { UserUpdateValidation } from 'user/validation/user.update.validation';
import { User } from 'user/user.decorator';
import { AuthBasic, AuthJwt } from 'auth/auth.decorator';

@Controller('api/user')
export class UserController {
    constructor(
        @Response() private readonly responseService: ResponseService,
        @Helper() private readonly helperService: HelperService,
        private readonly userService: UserService
    ) {}

    @AuthBasic()
    @Get('/')
    async getAll(
        @Query(RequestValidationPipe(UserCreateValidation)) data: IUserFind
    ): Promise<IApiSuccessResponse> {
        const { limit, page } = data;
        const { skip } = await this.helperService.pagination(page, limit);
        const user: UserEntity[] = await this.userService.findAll(skip, limit);
        return this.responseService.success(
            SystemSuccessStatusCode.USER_GET,
            user
        );
    }

    @AuthBasic()
    @Get('/get/:userId')
    async getOneById(
        @Param('id') userId: string
    ): Promise<IApiSuccessResponse> {
        const checkUser: UserEntity = await this.userService.findOneById(
            userId
        );
        if (!checkUser) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const { password, salt, ...user } = checkUser.toJSON();
        return this.responseService.success(
            SystemSuccessStatusCode.USER_GET,
            user
        );
    }

    @AuthJwt()
    @Post('/create')
    async create(
        @Body(RequestValidationPipe(UserCreateValidation)) data: IUserCreate
    ): Promise<IApiSuccessResponse> {
        const existEmail: Promise<UserEntity> = this.userService.findOneByEmail(
            data.email
        );
        const existMobileNumber: Promise<UserEntity> = this.userService.findOneByMobileNumber(
            data.mobileNumber
        );

        return Promise.all([existEmail, existMobileNumber])
            .then(async ([userExistEmail, userExistMobileNumber]) => {
                const errors: IApiErrors[] = [];
                if (userExistEmail) {
                    errors.push({
                        statusCode: SystemErrorStatusCode.USER_EMAIL_EXIST,
                        property: 'email'
                    });
                }
                if (userExistMobileNumber) {
                    errors.push({
                        statusCode:
                            SystemErrorStatusCode.USER_MOBILE_NUMBER_EXIST,
                        property: 'mobileNumber'
                    });
                }

                if (errors.length > 0) {
                    const message: IApiErrorMessage[] = this.responseService.setErrorMessage(
                        errors
                    );
                    const response: IApiErrorResponse = this.responseService.error(
                        SystemErrorStatusCode.REQUEST_ERROR,
                        message
                    );

                    throw response;
                }

                try {
                    const user: IUser = (
                        await this.userService.create(data)
                    ).toJSON();

                    return this.responseService.success(
                        SystemSuccessStatusCode.USER_CREATE,
                        user
                    );
                } catch (errCreate) {
                    const response: IApiErrorResponse = this.responseService.error(
                        SystemErrorStatusCode.GENERAL_ERROR
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
    async delete(
        @Param('userId') userId: string
    ): Promise<IApiSuccessResponse> {
        const user: UserEntity = await this.userService.findOneById(userId);
        if (!user) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        await this.userService.deleteOneById(userId);
        return this.responseService.success(
            SystemSuccessStatusCode.USER_DELETE,
            user
        );
    }

    @AuthJwt()
    @Put('/update/:userId')
    async update(
        @Param('userId') userId: string,
        @Body(RequestValidationPipe(UserUpdateValidation)) data: IUserUpdate
    ): Promise<IApiSuccessResponse> {
        const checkUser: UserEntity = await this.userService.findOneById(
            userId
        );
        if (!checkUser) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        try {
            const { password, salt, ...user } = (
                await this.userService.updateOneById(userId, data)
            ).toJSON();

            return this.responseService.success(
                SystemSuccessStatusCode.USER_UPDATE,
                user
            );
        } catch (err) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.GENERAL_ERROR
            );
            throw new InternalServerErrorException(response);
        }
    }

    @UseGuards(JwtGuard)
    @Get('/profile')
    async profile(@User('id') userId: string): Promise<IApiSuccessResponse> {
        const checkUser: UserEntity = await this.userService.findOneById(
            userId
        );
        if (!checkUser) {
            const response: IApiErrorResponse = this.responseService.error(
                SystemErrorStatusCode.USER_NOT_FOUND
            );
            throw new BadRequestException(response);
        }

        const { password, salt, ...user } = checkUser.toJSON();
        return this.responseService.success(
            SystemSuccessStatusCode.USER_GET,
            user
        );
    }
}
