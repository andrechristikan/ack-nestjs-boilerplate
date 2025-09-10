import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { ENUM_USER_STATUS_CODE_ERROR } from '@modules/user/enums/user.status-code.enum';
import { IUser } from '@modules/user/interfaces/user.interface';
import { IUserService } from '@modules/user/interfaces/user.service.interface';
import { UserUtil } from '@modules/user/utils/user.util';
import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_USER_STATUS } from '@prisma/client';

@Injectable()
export class UserService implements IUserService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly userUtil: UserUtil,
        private readonly authService: AuthService
    ) {}

    async validateUserGuard(
        request: IRequestApp,
        requiredVerified: boolean
    ): Promise<IUser> {
        const { userId } = request.user;
        const user = await this.databaseService.user.findUnique({
            where: { id: userId },
            include: {
                role: true,
            },
        });

        if (!user) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        } else if (user.status !== ENUM_USER_STATUS.ACTIVE) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.INACTIVE_FORBIDDEN,
                message: 'user.error.inactive',
            });
        }

        const checkPasswordExpired: boolean =
            this.authService.checkPasswordExpired(user.passwordExpired);
        if (checkPasswordExpired) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PASSWORD_EXPIRED,
                message: 'auth.error.passwordExpired',
            });
        } else if (requiredVerified === true && user.isVerified !== true) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.EMAIL_NOT_VERIFIED,
                message: 'user.error.emailNotVerified',
            });
        }

        return user;
    }

    async getList(
        { where, ...params }: IPaginationQueryOffsetParams,
        status?: Record<string, IPaginationIn>,
        role?: Record<string, IPaginationEqual>,
        country?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<UserListResponseDto>> {
        const { data, ...others } = await this.paginationService.offSet<IUser>(
            this.databaseService.user,
            {
                ...params,
                where: {
                    ...where,
                    ...status,
                    ...country,
                    ...role,
                },
                includes: {
                    role: true,
                },
            }
        );

        const users: UserListResponseDto[] = this.userUtil.mapList(data);

        return {
            data: users,
            ...others,
        };
    }

    async getOne(id: string): Promise<UserProfileResponseDto> {
        const user = await this.databaseService.user.findUnique({
            where: { id },
            include: {
                role: true,
                country: true,
                mobileNumbers: true,
            },
        });
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        return this.userUtil.mapProfile(user);
    }

    // async findAll(
    //     find?: Record<string, any>,
    //     options?: IDatabaseFindAllOptions
    // ): Promise<UserDoc[]> {
    //     return this.userRepository.findAll<UserDoc>(find, options);
    // }

    // async getTotal(
    //     find?: Record<string, any>,
    //     options?: IDatabaseGetTotalOptions
    // ): Promise<number> {
    //     return this.userRepository.getTotal(find, options);
    // }

    // async findAllWithRoleAndCountry(
    //     find?: Record<string, any>,
    //     options?: IDatabaseFindAllAggregateOptions
    // ): Promise<IUserEntity[]> {
    //     return this.userRepository.findAll<IUserEntity>(find, {
    //         ...options,
    //         join: true,
    //     });
    // }

    // async getTotalWithRoleAndCountry(
    //     find?: Record<string, any>,
    //     options?: IDatabaseAggregateOptions
    // ): Promise<number> {
    //     return this.userRepository.getTotal(find, {
    //         ...options,
    //         join: true,
    //     });
    // }

    // async findOneById(
    //     _id: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.findOneById<UserDoc>(_id, options);
    // }

    // async findOne(
    //     find: Record<string, any>,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.findOne<UserDoc>(find, options);
    // }

    // async findOneByEmail(
    //     email: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.findOne<UserDoc>(
    //         DatabaseHelperQueryContain('email', email, { fullWord: true }),
    //         options
    //     );
    // }

    // async findOneByUsername(
    //     username: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.findOne<UserDoc>(
    //         DatabaseHelperQueryContain('username', username, {
    //             fullWord: true,
    //         }),
    //         options
    //     );
    // }

    // async findOneByMobileNumberAndCountry(
    //     country: string,
    //     mobileNumber: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.findOne<UserDoc>(
    //         {
    //             'mobileNumber.number': mobileNumber,
    //             'mobileNumber.country': country,
    //         },
    //         options
    //     );
    // }

    // async findOneByMobileNumber(
    //     mobileNumber: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.findOne<UserDoc>(
    //         {
    //             'mobileNumber.number': mobileNumber,
    //         },
    //         options
    //     );
    // }

    // async findOneWithRoleAndCountry(
    //     find?: Record<string, any>,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<IUserDoc> {
    //     return this.userRepository.findOne<IUserDoc>(find, {
    //         ...options,
    //         join: true,
    //     });
    // }

    // async findOneWithRoleAndCountryById(
    //     _id: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<IUserDoc> {
    //     return this.userRepository.findOneById<IUserDoc>(_id, {
    //         ...options,
    //         join: true,
    //     });
    // }

    // async findAllActiveWithRoleAndCountry(
    //     find?: Record<string, any>,
    //     options?: IDatabaseFindAllOptions
    // ): Promise<IUserDoc[]> {
    //     return this.userRepository.findAll<IUserDoc>(
    //         { ...find, status: ENUM_USER_STATUS.ACTIVE },
    //         {
    //             ...options,
    //             join: this.userRepository._joinActive,
    //         }
    //     );
    // }

    // async getTotalActive(
    //     find?: Record<string, any>,
    //     options?: IDatabaseGetTotalOptions
    // ): Promise<number> {
    //     return this.userRepository.getTotal(
    //         { ...find, status: ENUM_USER_STATUS.ACTIVE },
    //         {
    //             ...options,
    //             join: this.userRepository._joinActive,
    //         }
    //     );
    // }

    // async findOneActiveById(
    //     _id: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<IUserDoc> {
    //     return this.userRepository.findOne<IUserDoc>(
    //         { _id, status: ENUM_USER_STATUS.ACTIVE },
    //         {
    //             ...options,
    //             join: this.userRepository._joinActive,
    //         }
    //     );
    // }

    // async findOneActiveByEmail(
    //     email: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<IUserDoc> {
    //     return this.userRepository.findOne<IUserDoc>(
    //         {
    //             ...DatabaseHelperQueryContain('email', email, {
    //                 fullWord: true,
    //             }),
    //             status: ENUM_USER_STATUS.ACTIVE,
    //         },
    //         {
    //             ...options,
    //             join: this.userRepository._joinActive,
    //         }
    //     );
    // }

    // async findOneActiveByMobileNumber(
    //     country: string,
    //     mobileNumber: string,
    //     options?: IDatabaseFindOneOptions
    // ): Promise<IUserDoc> {
    //     return this.userRepository.findOne<IUserDoc>(
    //         {
    //             'mobileNumber.number': mobileNumber,
    //             'mobileNumber.country': country,
    //             status: ENUM_USER_STATUS.ACTIVE,
    //         },
    //         {
    //             ...options,
    //             join: this.userRepository._joinActive,
    //         }
    //     );
    // }

    // async create(
    //     { email, name, role, country, gender }: UserCreateRequestDto,
    //     { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
    //     signUpFrom: ENUM_USER_SIGN_UP_FROM,
    //     options?: IDatabaseCreateOptions
    // ): Promise<UserDoc> {
    //     const username = this.createRandomUsername();

    //     const create: UserEntity = new UserEntity();
    //     create.name = name;
    //     create.email = email.toLowerCase();
    //     create.role = role;
    //     create.gender = gender;
    //     create.status = ENUM_USER_STATUS.ACTIVE;
    //     create.password = passwordHash;
    //     create.salt = salt;
    //     create.passwordExpired = passwordExpired;
    //     create.passwordCreated = passwordCreated;
    //     create.passwordAttempt = 0;
    //     create.signUpDate = this.helperDateService.create();
    //     create.signUpFrom = signUpFrom;
    //     create.country = country;
    //     create.username = username;
    //     create.verification = {
    //         email: false,
    //         mobileNumber: false,
    //     };
    //     create.termPolicy = {
    //         cookies: false,
    //         marketing: true,
    //         privacy: true,
    //         term: true,
    //     };

    //     return this.userRepository.create<UserEntity>(create, options);
    // }

    // async signUp(
    //     role: string,
    //     {
    //         email,
    //         name,
    //         country,
    //         cookies,
    //         marketing,
    //     }: Omit<AuthSignUpRequestDto, 'termPolicies' | 'password'>,
    //     { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
    //     options?: IDatabaseCreateOptions
    // ): Promise<UserDoc> {
    //     const username = this.createRandomUsername();

    //     const create: UserEntity = new UserEntity();
    //     create.name = name;
    //     create.email = email.toLowerCase();
    //     create.role = role;
    //     create.status = ENUM_USER_STATUS.ACTIVE;
    //     create.password = passwordHash;
    //     create.salt = salt;
    //     create.passwordExpired = passwordExpired;
    //     create.passwordCreated = passwordCreated;
    //     create.passwordAttempt = 0;
    //     create.signUpDate = this.helperDateService.create();
    //     create.signUpFrom = ENUM_USER_SIGN_UP_FROM.PUBLIC;
    //     create.country = country;
    //     create.username = username;
    //     create.verification = {
    //         email: false,
    //         mobileNumber: false,
    //     };
    //     create.termPolicy = {
    //         cookies,
    //         marketing,
    //         privacy: true,
    //         term: true,
    //     };

    //     return this.userRepository.create<UserEntity>(create, options);
    // }

    // async existByRole(
    //     role: string,
    //     options?: IDatabaseExistsOptions
    // ): Promise<boolean> {
    //     return this.userRepository.exists(
    //         {
    //             role,
    //         },
    //         options
    //     );
    // }

    // async existByEmail(
    //     email: string,
    //     options?: IDatabaseExistsOptions
    // ): Promise<boolean> {
    //     return this.userRepository.exists(
    //         DatabaseHelperQueryContain('email', email, { fullWord: true }),
    //         options
    //     );
    // }

    // async existByUsername(
    //     username: string,
    //     options?: IDatabaseExistsOptions
    // ): Promise<boolean> {
    //     return this.userRepository.exists(
    //         DatabaseHelperQueryContain('username', username, {
    //             fullWord: true,
    //         }),
    //         options
    //     );
    // }

    // async updatePhoto(
    //     repository: UserDoc,
    //     photo: AwsS3Dto,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.photo = {
    //         ...photo,
    //         size: new Types.Decimal128(photo.size.toString()),
    //     };

    //     return this.userRepository.save(repository, options);
    // }

    // async updatePassword(
    //     repository: UserDoc,
    //     { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.password = passwordHash;
    //     repository.passwordExpired = passwordExpired;
    //     repository.passwordCreated = passwordCreated;
    //     repository.salt = salt;
    //     repository.passwordAttempt = 0;

    //     return this.userRepository.save(repository, options);
    // }

    // async updateStatus(
    //     repository: UserDoc,
    //     { status }: UserUpdateStatusRequestDto,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserEntity> {
    //     repository.status = status;

    //     return this.userRepository.save(repository, options);
    // }

    // async updatePasswordAttempt(
    //     repository: UserDoc,
    //     { passwordAttempt }: UserUpdatePasswordAttemptRequestDto,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.passwordAttempt = passwordAttempt;

    //     return this.userRepository.save(repository, options);
    // }

    // async increasePasswordAttempt(
    //     repository: UserDoc,
    //     options?: IDatabaseUpdateOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.updateRaw(
    //         { _id: repository._id },
    //         this.databaseService.aggregateIncrement('passwordAttempt', 1),
    //         options
    //     );
    // }

    // async resetPasswordAttempt(
    //     repository: UserDoc,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.passwordAttempt = 0;

    //     return this.userRepository.save(repository, options);
    // }

    // async updatePasswordExpired(
    //     repository: UserDoc,
    //     passwordExpired: Date,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.passwordExpired = passwordExpired;

    //     return this.userRepository.save(repository, options);
    // }

    // async update(
    //     repository: UserDoc,
    //     { country, name, role, gender }: UserUpdateRequestDto,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.country = country;
    //     repository.name = name;
    //     repository.role = role;
    //     repository.gender = gender;

    //     return this.userRepository.save(repository, options);
    // }

    // async updateMobileNumber(
    //     repository: UserDoc,
    //     { country, number }: UserUpdateMobileNumberRequestDto,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.mobileNumber = {
    //         country,
    //         number,
    //     };
    //     repository.verification.mobileNumber = false;
    //     repository.verification.mobileNumberVerifiedDate = undefined;

    //     return this.userRepository.save(repository, options);
    // }

    // async updateClaimUsername(
    //     repository: UserDoc,
    //     { username }: UserUpdateClaimUsernameRequestDto,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.username = username.toLowerCase();

    //     return this.userRepository.save(repository, options);
    // }

    // async removeMobileNumber(
    //     repository: UserDoc,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.mobileNumber = undefined;

    //     return this.userRepository.save(repository, options);
    // }

    // async softDelete(
    //     repository: UserDoc,
    //     options?: IDatabaseSoftDeleteOptions
    // ): Promise<UserDoc> {
    //     return this.userRepository.softDelete(repository, options);
    // }

    // async deleteMany(
    //     find?: Record<string, any>,
    //     options?: IDatabaseDeleteManyOptions
    // ): Promise<boolean> {
    //     await this.userRepository.deleteMany(find, options);

    //     return true;
    // }

    // async updateProfile(
    //     repository: UserDoc,
    //     { country, name, gender }: UserUpdateProfileRequestDto,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.country = country;
    //     repository.name = name;
    //     repository.gender = gender;

    //     return this.userRepository.save(repository, options);
    // }

    // async updateVerificationEmail(
    //     repository: UserDoc,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.verification.email = true;
    //     repository.verification.emailVerifiedDate =
    //         this.helperDateService.create();

    //     return this.userRepository.save(repository, options);
    // }

    // async updateVerificationMobileNumber(
    //     repository: UserDoc,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.verification.mobileNumber = true;
    //     repository.verification.mobileNumberVerifiedDate =
    //         this.helperDateService.create();

    //     return this.userRepository.save(repository, options);
    // }

    // async join(repository: UserDoc): Promise<IUserDoc> {
    //     return this.userRepository.join(repository, this.userRepository._join!);
    // }

    // async acceptTermPolicy(
    //     repository: UserDoc,
    //     type: ENUM_TERM_POLICY_TYPE,
    //     options?: IDatabaseSaveOptions
    // ): Promise<UserDoc> {
    //     repository.termPolicy[type.toLowerCase()] = true;

    //     return this.userRepository.save(repository, options);
    // }

    // async releaseTermPolicy(
    //     type: ENUM_TERM_POLICY_TYPE,
    //     options?: IDatabaseUpdateManyOptions
    // ): Promise<void> {
    //     await this.userRepository.updateMany(
    //         {
    //             [`termPolicy.${type.toLowerCase()}`]: true,
    //         },
    //         {
    //             [`termPolicy.${type.toLowerCase()}`]: false,
    //         },
    //         options
    //     );

    //     return;
    // }
}
