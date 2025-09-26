import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Post,
    Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyProtected } from '@modules/api-key/decorators/api-key.decorator';
import { AuthJwtPayload } from '@modules/auth/decorators/auth.jwt.decorator';
import {
    AuthSocialAppleProtected,
    AuthSocialGoogleProtected,
} from '@modules/auth/decorators/auth.social.decorator';

@ApiTags('modules.public.auth')
@Controller({
    version: '1',
    path: '/auth',
})
export class AuthPublicController {
    constructor() {}

    @AuthPublicLoginCredentialDoc()
    @Response('auth.loginWithCredential')
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/login/credential')
    async loginWithCredential(
        @Body() { email, password }: AuthLoginRequestDto,
        @Req() request: IRequestApp
    ): Promise<IResponse<AuthLoginResponseDto>> {
        let user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        const passwordAttempt: boolean = this.authService.getPasswordAttempt();
        const passwordMaxAttempt: number =
            this.authService.getPasswordMaxAttempt();
        if (passwordAttempt && user.passwordAttempt >= passwordMaxAttempt) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_ATTEMPT_MAX,
                message: 'auth.error.passwordAttemptMax',
            });
        }

        const validate: boolean = this.authService.validateUser(
            password,
            user.password
        );
        if (!validate) {
            user = await this.userService.increasePasswordAttempt(user);

            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_NOT_MATCH,
                message: 'auth.error.passwordNotMatch',
                data: {
                    attempt: user.passwordAttempt,
                },
            });
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        } else if (userWithRole.verification.email !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        }

        const databaseSession: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const session = await this.sessionService.create(
                request,
                {
                    user: user._id,
                },
                { session: databaseSession }
            );

            await this.sessionService.setLoginSession(userWithRole, session);

            const token = this.authService.createToken(
                userWithRole,
                session._id
            );

            await this.databaseService.commitTransaction(databaseSession);

            return {
                data: token,
            };
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(databaseSession);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @AuthPublicLoginSocialGoogleDoc()
    @Response('auth.loginWithSocialGoogle')
    @AuthSocialGoogleProtected()
    @SettingFeatureFlag('auth.social.google')
    @Post('/login/social/google')
    async loginWithGoogle(
        @AuthJwtPayload<IAuthSocialGooglePayload>('email')
        email: string,
        @Req() request: IRequestApp
    ): Promise<IResponse<AuthLoginResponseDto>> {
        const user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        } else if (userWithRole.verification.email !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        }

        const databaseSession: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const session = await this.sessionService.create(
                request,
                {
                    user: user._id,
                },
                { session: databaseSession }
            );

            await this.sessionService.setLoginSession(userWithRole, session);

            await this.databaseService.commitTransaction(databaseSession);

            const token = this.authService.createToken(
                userWithRole,
                session._id
            );

            return {
                data: token,
            };
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(databaseSession);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @AuthPublicLoginSocialAppleDoc()
    @Response('user.loginWithSocialApple')
    @AuthSocialAppleProtected()
    @SettingFeatureFlag('auth.social.apple')
    @Post('/login/social/apple')
    async loginWithApple(
        @AuthJwtPayload<IAuthSocialApplePayload>('email')
        email: string,
        @Req() request: IRequestApp
    ): Promise<IResponse<AuthLoginResponseDto>> {
        const user: UserDoc = await this.userService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const userWithRole: IUserDoc = await this.userService.join(user);
        if (!userWithRole.role.isActive) {
            throw new ForbiddenException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'role.error.inactive',
            });
        } else if (userWithRole.verification.email !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        await this.userService.resetPasswordAttempt(user);

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        }

        const databaseSession: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const session = await this.sessionService.create(
                request,
                {
                    user: user._id,
                },
                { session: databaseSession }
            );
            await this.sessionService.setLoginSession(userWithRole, session);

            await this.databaseService.commitTransaction(databaseSession);

            const token = this.authService.createToken(
                userWithRole,
                session._id
            );

            return {
                data: token,
            };
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(databaseSession);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @AuthPublicSignUpDoc()
    @Response('auth.signUp')
    @ApiKeyProtected()
    @Post('/sign-up')
    async signUp(
        @Body()
        {
            email,
            name,
            password: passwordString,
            country,
            cookies,
            marketing,
        }: AuthSignUpRequestDto,
        @RequestLanguage() requestLanguage: ENUM_MESSAGE_LANGUAGE
    ): Promise<void> {
        const promises: Promise<any>[] = [
            this.roleService.findOneByName('individual'),
            this.userService.existByEmail(email),
            this.countryService.findOneById(country),
        ];

        const [role, emailExist, checkCountry] = await Promise.all(promises);

        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        } else if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        } else if (emailExist) {
            throw new ConflictException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_EXIST,
                message: 'user.error.emailExist',
            });
        }

        const password = this.authService.createPassword(passwordString);

        const session: ClientSession =
            await this.databaseService.createTransaction();

        try {
            const user = await this.userService.signUp(
                role._id,
                {
                    email,
                    name,
                    country,
                    cookies,
                    marketing,
                },
                password,
                { session }
            );

            const termPolicyAcceptance = [
                ENUM_TERM_POLICY_TYPE.PRIVACY,
                ENUM_TERM_POLICY_TYPE.TERM,
            ];

            if (cookies) {
                termPolicyAcceptance.push(ENUM_TERM_POLICY_TYPE.COOKIES);
            }

            if (marketing) {
                termPolicyAcceptance.push(ENUM_TERM_POLICY_TYPE.MARKETING);
            }

            await this.termPolicyAcceptanceService.createAcceptances(
                user._id,
                termPolicyAcceptance,
                requestLanguage,
                country,
                { session }
            );

            const verification =
                await this.verificationService.createEmailByUser(user, {
                    session,
                });

            await this.passwordHistoryService.createByUser(
                user,
                {
                    type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
                },
                { session }
            );

            await this.activityService.createByUser(
                user,
                {
                    description: this.messageService.setMessage(
                        'activity.user.signUp'
                    ),
                },
                { session }
            );

            await Promise.all([
                this.emailQueue.add(
                    ENUM_SEND_EMAIL_PROCESS.WELCOME,
                    {
                        send: { email, name },
                    },
                    {
                        debounce: {
                            id: `${ENUM_SEND_EMAIL_PROCESS.WELCOME}-${user._id}`,
                            ttl: 1000,
                        },
                    }
                ),
                this.emailQueue.add(
                    ENUM_SEND_EMAIL_PROCESS.VERIFICATION,
                    {
                        send: { email, name },
                        data: {
                            otp: verification.otp,
                            expiredAt: verification.expiredDate,
                            reference: verification.reference,
                        },
                    },
                    {
                        debounce: {
                            id: `${ENUM_SEND_EMAIL_PROCESS.VERIFICATION}-${user._id}`,
                            ttl: 1000,
                        },
                    }
                ),
            ]);

            await this.databaseService.commitTransaction(session);
        } catch (err: unknown) {
            await this.databaseService.abortTransaction(session);

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }
}
