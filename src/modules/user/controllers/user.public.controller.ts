import {
    BadRequestException,
    Body,
    Controller,
    InternalServerErrorException,
    NotFoundException,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthApiKey } from 'src/common/auth/decorators/auth.api-key.decorator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { DatabaseConnection } from 'src/common/database/decorators/database.decorator';
import {
    DatabaseConnectionType,
    DatabaseSessionType,
} from 'src/common/database/interfaces/database.interface';
import { DatabaseTransactionService } from 'src/common/database/services/database.transaction.service';
import { ENUM_ERROR_STATUS_CODE_ERROR } from 'src/common/error/constants/error.status-code.constant';
import {
    RequestValidateTimestamp,
    RequestValidateUserAgent,
} from 'src/common/request/decorators/request.decorator';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { Role } from 'src/modules/role/schemas/role.schema';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserSignUpDoc } from 'src/modules/user/docs/user.public.doc';
import { UserSignUpDto } from 'src/modules/user/dtos/user.sign-up.dto';
import { IUserCheckExist } from 'src/modules/user/interfaces/user.interface';
import { UserService } from 'src/modules/user/services/user.service';

@ApiTags('modules.public.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserPublicController {
    constructor(
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly roleService: RoleService,
        @DatabaseConnection()
        private readonly connection: DatabaseConnectionType,
        private readonly databaseTransactionService: DatabaseTransactionService
    ) {}

    @UserSignUpDoc()
    @Response('user.signUp')
    @Post('/sign-up')
    async signUp(
        @Body()
        { email, mobileNumber, ...body }: UserSignUpDto
    ): Promise<void> {
        const role: Role = await this.roleService.findOne<Role>({
            name: 'user',
        });
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR,
                message: 'role.error.notFound',
            });
        }

        const checkExist: IUserCheckExist = await this.userService.checkExist(
            email,
            mobileNumber
        );

        if (checkExist.email && checkExist.mobileNumber) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR,
                message: 'user.error.exist',
            });
        } else if (checkExist.email) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR,
                message: 'user.error.emailExist',
            });
        } else if (checkExist.mobileNumber) {
            throw new BadRequestException({
                statusCode:
                    ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR,
                message: 'user.error.mobileNumberExist',
            });
        }

        try {
            const password = await this.authService.createPassword(
                body.password
            );

            await this.userService.create({
                firstName: body.firstName,
                lastName: body.lastName,
                email,
                mobileNumber,
                role: role._id,
                password: password.passwordHash,
                passwordExpired: password.passwordExpired,
                salt: password.salt,
            });

            return;
        } catch (err: any) {
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }

    @Response('user.test')
    @Post('/test')
    async test(): Promise<void> {
        // const session: DatabaseSessionType =
        //     await this.databaseTransactionService.createSession(
        //         this.connection
        //     );
        // await this.databaseTransactionService.startTransaction(session);

        console.log('aaa');
        try {
            console.log('bbb');
            const up = await this.userService.findOneById(
                '62f08c13e101c7a42bb728b6'
                // {
                //     firstName: 'ubah',
                //     lastName: 'coba',
                // }
                // { session }
            );

            console.log('ccc', up);
            // await this.databaseTransactionService.commitTransaction(session);
            console.log('fff');
            return;
        } catch (err: any) {
            console.log('ddd');
            // await this.databaseTransactionService.rollbackTransaction(session);
            // await this.databaseTransactionService.endTransaction(session);

            console.log('eee');
            throw new InternalServerErrorException({
                statusCode: ENUM_ERROR_STATUS_CODE_ERROR.ERROR_UNKNOWN,
                message: 'http.serverError.internalServerError',
                error: err.message,
            });
        }
    }
}
