import { Injectable } from '@nestjs/common';
import {
    IDatabaseAggregateOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
    IDatabaseSoftDeleteOptions,
    IDatabaseUpdateManyOptions,
    IDatabaseUpdateOptions,
} from '@common/database/interfaces/database.interface';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ConfigService } from '@nestjs/config';
import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { plainToInstance } from 'class-transformer';
import { Document, Types } from 'mongoose';
import { IUserService } from '@modules/user/interfaces/user.service.interface';
import { UserRepository } from '@modules/user/repository/repositories/user.repository';
import {
    UserDoc,
    UserEntity,
} from '@modules/user/repository/entities/user.entity';
import { IUserDoc, IUserEntity } from '@modules/user/interfaces/user.interface';
import {
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from '@modules/user/enums/user.enum';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserUpdatePasswordAttemptRequestDto } from '@modules/user/dtos/request/user.update-password-attempt.request.dto';
import { UserUpdateRequestDto } from '@modules/user/dtos/request/user.update.request.dto';
import { UserUpdateMobileNumberRequestDto } from '@modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserShortResponseDto } from '@modules/user/dtos/response/user.short.response.dto';
import { UserGetResponseDto } from '@modules/user/dtos/response/user.get.response.dto';
import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthSignUpRequestDto } from '@modules/auth/dtos/request/auth.sign-up.request.dto';
import { UserUpdateClaimUsernameRequestDto } from '@modules/user/dtos/request/user.update-claim-username.request.dto';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { CountryDoc } from '@modules/country/repository/entities/country.entity';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { DatabaseHelperQueryContain } from '@common/database/decorators/database.decorator';
import { UserCensorResponseDto } from '@modules/user/dtos/response/user.censor.response.dto';
import { DatabaseService } from '@common/database/services/database.service';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { UserUploadPhotoProfileRequestDto } from '@modules/user/dtos/request/user.upload-photo-profile.request.dto';

@Injectable()
export class UserService implements IUserService {
    private readonly usernamePrefix: string;
    private readonly usernamePattern: RegExp;
    private readonly uploadPath: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly databaseService: DatabaseService
    ) {
        this.usernamePrefix = this.configService.get<string>(
            'user.usernamePrefix'
        );
        this.usernamePattern = this.configService.get<RegExp>(
            'user.usernamePattern'
        );
        this.uploadPath = this.configService.get<string>('user.uploadPath');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]> {
        return this.userRepository.findAll<UserDoc>(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userRepository.getTotal(find, options);
    }

    async findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<IUserEntity[]> {
        return this.userRepository.findAll<IUserEntity>(find, {
            ...options,
            join: true,
        });
    }

    async getTotalWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseAggregateOptions
    ): Promise<number> {
        return this.userRepository.getTotal(find, {
            ...options,
            join: true,
        });
    }

    async findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOneById<UserDoc>(_id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>(find, options);
    }

    async findOneByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>(
            DatabaseHelperQueryContain('email', email, { fullWord: true }),
            options
        );
    }

    async findOneByUsername(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>(
            DatabaseHelperQueryContain('username', username, {
                fullWord: true,
            }),
            options
        );
    }

    async findOneByMobileNumberAndCountry(
        country: string,
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>(
            {
                'mobileNumber.number': mobileNumber,
                'mobileNumber.country': country,
            },
            options
        );
    }

    async findOneByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc> {
        return this.userRepository.findOne<UserDoc>(
            {
                'mobileNumber.number': mobileNumber,
            },
            options
        );
    }

    async findOneWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(find, {
            ...options,
            join: true,
        });
    }

    async findOneWithRoleAndCountryById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOneById<IUserDoc>(_id, {
            ...options,
            join: true,
        });
    }

    async findAllActiveWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]> {
        return this.userRepository.findAll<IUserDoc>(
            { ...find, status: ENUM_USER_STATUS.ACTIVE },
            {
                ...options,
                join: this.userRepository._joinActive,
            }
        );
    }

    async getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.userRepository.getTotal(
            { ...find, status: ENUM_USER_STATUS.ACTIVE },
            {
                ...options,
                join: this.userRepository._joinActive,
            }
        );
    }

    async findOneActiveById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            { _id, status: ENUM_USER_STATUS.ACTIVE },
            {
                ...options,
                join: this.userRepository._joinActive,
            }
        );
    }

    async findOneActiveByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            {
                ...DatabaseHelperQueryContain('email', email, {
                    fullWord: true,
                }),
                status: ENUM_USER_STATUS.ACTIVE,
            },
            {
                ...options,
                join: this.userRepository._joinActive,
            }
        );
    }

    async findOneActiveByMobileNumber(
        country: string,
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc> {
        return this.userRepository.findOne<IUserDoc>(
            {
                'mobileNumber.number': mobileNumber,
                'mobileNumber.country': country,
                status: ENUM_USER_STATUS.ACTIVE,
            },
            {
                ...options,
                join: this.userRepository._joinActive,
            }
        );
    }

    async create(
        { email, name, role, country, gender }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const username = this.createRandomUsername();

        const create: UserEntity = new UserEntity();
        create.name = name;
        create.email = email.toLowerCase();
        create.role = role;
        create.gender = gender;
        create.status = ENUM_USER_STATUS.ACTIVE;
        create.password = passwordHash;
        create.salt = salt;
        create.passwordExpired = passwordExpired;
        create.passwordCreated = passwordCreated;
        create.passwordAttempt = 0;
        create.signUpDate = this.helperDateService.create();
        create.signUpFrom = signUpFrom;
        create.country = country;
        create.username = username;
        create.verification = {
            email: false,
            mobileNumber: false,
        };
        create.termPolicy = {
            cookies: false,
            marketing: true,
            privacy: true,
            term: true,
        };

        return this.userRepository.create<UserEntity>(create, options);
    }

    async signUp(
        role: string,
        {
            email,
            name,
            country,
            cookies,
            marketing,
        }: Omit<AuthSignUpRequestDto, 'termPolicies' | 'password'>,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc> {
        const username = this.createRandomUsername();

        const create: UserEntity = new UserEntity();
        create.name = name;
        create.email = email.toLowerCase();
        create.role = role;
        create.status = ENUM_USER_STATUS.ACTIVE;
        create.password = passwordHash;
        create.salt = salt;
        create.passwordExpired = passwordExpired;
        create.passwordCreated = passwordCreated;
        create.passwordAttempt = 0;
        create.signUpDate = this.helperDateService.create();
        create.signUpFrom = ENUM_USER_SIGN_UP_FROM.PUBLIC;
        create.country = country;
        create.username = username;
        create.verification = {
            email: false,
            mobileNumber: false,
        };
        create.termPolicy = {
            cookies,
            marketing,
            privacy: true,
            term: true,
        };

        return this.userRepository.create<UserEntity>(create, options);
    }

    async existByRole(
        role: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            {
                role,
            },
            options
        );
    }

    async existByEmail(
        email: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            DatabaseHelperQueryContain('email', email, { fullWord: true }),
            options
        );
    }

    async existByUsername(
        username: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        return this.userRepository.exists(
            DatabaseHelperQueryContain('username', username, {
                fullWord: true,
            }),
            options
        );
    }

    async updatePhoto(
        repository: UserDoc,
        photo: AwsS3Dto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.photo = {
            ...photo,
            size: new Types.Decimal128(photo.size.toString()),
        };

        return this.userRepository.save(repository, options);
    }

    async updatePassword(
        repository: UserDoc,
        { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.password = passwordHash;
        repository.passwordExpired = passwordExpired;
        repository.passwordCreated = passwordCreated;
        repository.salt = salt;
        repository.passwordAttempt = 0;

        return this.userRepository.save(repository, options);
    }

    async updateStatus(
        repository: UserDoc,
        { status }: UserUpdateStatusRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity> {
        repository.status = status;

        return this.userRepository.save(repository, options);
    }

    async updatePasswordAttempt(
        repository: UserDoc,
        { passwordAttempt }: UserUpdatePasswordAttemptRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordAttempt = passwordAttempt;

        return this.userRepository.save(repository, options);
    }

    async increasePasswordAttempt(
        repository: UserDoc,
        options?: IDatabaseUpdateOptions
    ): Promise<UserDoc> {
        return this.userRepository.updateRaw(
            { _id: repository._id },
            this.databaseService.aggregateIncrement('passwordAttempt', 1),
            options
        );
    }

    async resetPasswordAttempt(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordAttempt = 0;

        return this.userRepository.save(repository, options);
    }

    async updatePasswordExpired(
        repository: UserDoc,
        passwordExpired: Date,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.passwordExpired = passwordExpired;

        return this.userRepository.save(repository, options);
    }

    async update(
        repository: UserDoc,
        { country, name, role, gender }: UserUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.country = country;
        repository.name = name;
        repository.role = role;
        repository.gender = gender;

        return this.userRepository.save(repository, options);
    }

    async updateMobileNumber(
        repository: UserDoc,
        { country, number }: UserUpdateMobileNumberRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.mobileNumber = {
            country,
            number,
        };
        repository.verification.mobileNumber = false;
        repository.verification.mobileNumberVerifiedDate = undefined;

        return this.userRepository.save(repository, options);
    }

    async updateClaimUsername(
        repository: UserDoc,
        { username }: UserUpdateClaimUsernameRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.username = username.toLowerCase();

        return this.userRepository.save(repository, options);
    }

    async removeMobileNumber(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.mobileNumber = undefined;

        return this.userRepository.save(repository, options);
    }

    async softDelete(
        repository: UserDoc,
        options?: IDatabaseSoftDeleteOptions
    ): Promise<UserDoc> {
        return this.userRepository.softDelete(repository, options);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.userRepository.deleteMany(find, options);

        return true;
    }

    async updateProfile(
        repository: UserDoc,
        { country, name, gender }: UserUpdateProfileRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.country = country;
        repository.name = name;
        repository.gender = gender;

        return this.userRepository.save(repository, options);
    }

    async updateVerificationEmail(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.verification.email = true;
        repository.verification.emailVerifiedDate =
            this.helperDateService.create();

        return this.userRepository.save(repository, options);
    }

    async updateVerificationMobileNumber(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.verification.mobileNumber = true;
        repository.verification.mobileNumberVerifiedDate =
            this.helperDateService.create();

        return this.userRepository.save(repository, options);
    }

    async join(repository: UserDoc): Promise<IUserDoc> {
        return this.userRepository.join(repository, this.userRepository._join!);
    }

    createRandomFilenamePhoto(
        user: string,
        { mime }: UserUploadPhotoProfileRequestDto
    ): string {
        let path: string = this.uploadPath.replace('{user}', user);
        const randomPath = this.helperStringService.random(10);
        const extension = mime.split('/')[1];

        if (path.startsWith('/')) {
            path = path.replace('/', '');
        }

        return `${path}/${randomPath}.${extension.toLowerCase()}`;
    }

    createRandomUsername(): string {
        const suffix = this.helperStringService.random(6);

        return `${this.usernamePrefix}-${suffix}`.toLowerCase();
    }

    checkUsernamePattern(username: string): boolean {
        return !!username.search(this.usernamePattern);
    }

    async checkUsernameBadWord(username: string): Promise<boolean> {
        const filterBadWordModule = await import('bad-words');
        const filterBadWord = new filterBadWordModule.Filter();
        return filterBadWord.isProfane(username);
    }

    mapProfile(user: IUserDoc | IUserEntity): UserProfileResponseDto {
        return plainToInstance(
            UserProfileResponseDto,
            user instanceof Document ? user.toObject() : user
        );
    }

    mapCensor(user: UserDoc | UserEntity): UserCensorResponseDto {
        const plainObject = user instanceof Document ? user.toObject() : user;
        plainObject.name = this.helperStringService.censor(plainObject.name);

        return plainToInstance(UserCensorResponseDto, plainObject);
    }

    mapList(users: IUserDoc[] | IUserEntity[]): UserListResponseDto[] {
        return plainToInstance(
            UserListResponseDto,
            users.map((u: IUserDoc | IUserEntity) =>
                u instanceof Document ? u.toObject() : u
            )
        );
    }

    mapShort(users: IUserDoc[] | IUserEntity[]): UserShortResponseDto[] {
        return plainToInstance(
            UserShortResponseDto,
            users.map((u: IUserDoc | IUserEntity) =>
                u instanceof Document ? u.toObject() : u
            )
        );
    }

    mapGet(user: IUserDoc | IUserEntity): UserGetResponseDto {
        return plainToInstance(
            UserGetResponseDto,
            user instanceof Document ? user.toObject() : user
        );
    }

    checkMobileNumber(mobileNumber: string, country: CountryDoc): boolean {
        return country.phoneCode.some(e => mobileNumber.startsWith(e));
    }

    async acceptTermPolicy(
        repository: UserDoc,
        type: ENUM_TERM_POLICY_TYPE,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc> {
        repository.termPolicy[type.toLowerCase()] = true;

        return this.userRepository.save(repository, options);
    }

    async releaseTermPolicy(
        type: ENUM_TERM_POLICY_TYPE,
        options?: IDatabaseUpdateManyOptions
    ): Promise<void> {
        await this.userRepository.updateMany(
            {
                [`termPolicy.${type.toLowerCase()}`]: true,
            },
            {
                [`termPolicy.${type.toLowerCase()}`]: false,
            },
            options
        );

        return;
    }
}
