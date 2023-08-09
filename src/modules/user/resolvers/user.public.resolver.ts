import {Resolver, Query, Mutation, Args} from '@nestjs/graphql';
import {UserSchema} from "../graphql/schema/users.schema";
import {UserLoginInput} from "../dtos/user.login.dto";
import {DatabaseConnection} from "../../../common/database/decorators/database.decorator";
import {Connection} from "mongoose";
import {UserService} from "../services/user.service";
import {AuthService} from "../../../common/auth/services/auth.service";
import {RoleService} from "../../role/services/role.service";
import {SettingService} from "../../../common/setting/services/setting.service";
import {IResponse} from "../../../common/response/interfaces/response.interface";
import {UserDoc} from "../repository/entities/user.entity";
import {
    BadRequestException, CanActivate, ExecutionContext,
    ForbiddenException, Injectable,
    NotFoundException,
    Req,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import {ENUM_USER_STATUS_CODE_ERROR, ENUM_USER_STATUS_CODE_SUCCESS} from "../constants/user.status-code.constant";
import {IUserDoc} from "../interfaces/user.interface";
import {ENUM_ROLE_STATUS_CODE_ERROR} from "../../role/constants/role.status-code.constant";
import {UserPayloadSerialization} from "../serializations/user.payload.serialization";
import {ENUM_AUTH_LOGIN_WITH} from "../../../common/auth/constants/auth.enum.constant";
import {UserLoginSerialization, UserLoginSerializationGql} from "../serializations/user.login.serialization";
import {IResponseGql} from "../../../common/response/interfaces/response.gql.interface";
import {TestGuard} from "../../../common/test.guard";
import {GraphqlRequestDecorator} from "../../../common/request/decorators/request.decorator";
import {Response} from "../../../common/response/decorators/response.decorator";



@Resolver(()=>UserSchema)
export class UserPublicResolver {

    constructor(
        @DatabaseConnection() private readonly databaseConnection: Connection,
        private readonly userService: UserService,
        private readonly authService: AuthService,
        private readonly roleService: RoleService,
        private readonly settingService: SettingService
    ) {}
    @Query(() => UserSchema)
    sayHello(): string {
        return 'Hello World!';
    }

    // @Response('user.login', {
    //     serialization: UserLoginSerialization,
    // })
    @Response('user.login', {
        serialization: UserLoginSerialization,
    })
    @Mutation(() => UserLoginSerializationGql)

    @GraphqlRequestDecorator()

    async login(@Req() req,@Args('data') { email, password }: UserLoginInput): Promise<IResponseGql>  {

        //eslint-disable-next-line
        console.log("Request is"+req)
        const user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR,
                message: 'user.error.notFound',
            });
        }

        const passwordAttempt: boolean =
            await this.settingService.getPasswordAttempt();
        const maxPasswordAttempt: number =
            await this.settingService.getMaxPasswordAttempt();
        if (passwordAttempt && user.passwordAttempt >= maxPasswordAttempt) {
            throw new ForbiddenException({
                statusCode:
                ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_ATTEMPT_MAX_ERROR,
                message: 'user.error.passwordAttemptMax',
            });
        }

        const validate: boolean = await this.authService.validateUser(
            password,
            user.password
        );
        if (!validate) {
            await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode:
                ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR,
                message: 'user.error.passwordNotMatch',
            });
        } else if (user.blocked) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_BLOCKED_ERROR,
                message: 'user.error.blocked',
            });
        } else if (user.inactivePermanent) {
            throw new ForbiddenException({
                statusCode:
                ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_PERMANENT_ERROR,
                message: 'user.error.inactivePermanent',
            });
        } else if (!user.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_ERROR,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.joinWithRole(
            user
        );
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR,
                message: 'role.error.inactive',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const payload: UserPayloadSerialization =
            await this.userService.payloadSerialization(userWithRole);
        const tokenType: string = await this.authService.getTokenType();
        const expiresIn: number =
            await this.authService.getAccessTokenExpirationTime();
        const payloadAccessToken: Record<string, any> =
            await this.authService.createPayloadAccessToken(payload);
        const payloadRefreshToken: Record<string, any> =
            await this.authService.createPayloadRefreshToken(payload._id, {
                loginWith: ENUM_AUTH_LOGIN_WITH.LOCAL,
            });

        const payloadEncryption = await this.authService.getPayloadEncryption();
        let payloadHashedAccessToken: Record<string, any> | string =
            payloadAccessToken;
        let payloadHashedRefreshToken: Record<string, any> | string =
            payloadRefreshToken;

        if (payloadEncryption) {
            payloadHashedAccessToken =
                await this.authService.encryptAccessToken(payloadAccessToken);
            payloadHashedRefreshToken =
                await this.authService.encryptRefreshToken(payloadRefreshToken);
        }

        const accessToken: string = await this.authService.createAccessToken(
            payloadHashedAccessToken
        );

        const refreshToken: string = await this.authService.createRefreshToken(
            payloadHashedRefreshToken
        );

        const checkPasswordExpired: boolean =
            await this.authService.checkPasswordExpired(user.passwordExpired);

        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode:
                ENUM_USER_STATUS_CODE_SUCCESS.USER_PASSWORD_EXPIRED_ERROR,
                message: 'user.error.passwordExpired',
            });
        }

        return {
            data: {
                tokenType,
                expiresIn,
                accessToken,
                refreshToken,
            },

        };
    }
}