import { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import {
    IDatabaseAggregateOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllAggregateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
    IDatabaseUpdateOptions,
} from '@common/database/interfaces/database.interface';
import {
    UserDoc,
    UserEntity,
} from '@modules/user/repository/entities/user.entity';
import { IUserDoc, IUserEntity } from '@modules/user/interfaces/user.interface';
import { UserUpdatePasswordAttemptRequestDto } from '@modules/user/dtos/request/user.update-password-attempt.request.dto';
import { ENUM_USER_SIGN_UP_FROM } from '@modules/user/enums/user.enum';
import { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { UserUpdateRequestDto } from '@modules/user/dtos/request/user.update.request.dto';
import { UserUpdateMobileNumberRequestDto } from '@modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserProfileResponseDto } from '@modules/user/dtos/response/user.profile.response.dto';
import { UserListResponseDto } from '@modules/user/dtos/response/user.list.response.dto';
import { UserShortResponseDto } from '@modules/user/dtos/response/user.short.response.dto';
import { UserGetResponseDto } from '@modules/user/dtos/response/user.get.response.dto';
import { AwsS3Dto } from '@modules/aws/dtos/aws.s3.dto';
import { AuthSignUpRequestDto } from '@modules/auth/dtos/request/auth.sign-up.request.dto';
import { UserUpdateClaimUsernameRequestDto } from '@modules/user/dtos/request/user.update-claim-username.request.dto';
import { UserUpdateProfileRequestDto } from '@modules/user/dtos/request/user.update-profile.request.dto';
import { UserUpdateStatusRequestDto } from '@modules/user/dtos/request/user.update-status.request.dto';
import { CountryDoc } from '@modules/country/repository/entities/country.entity';
import { UserCensorResponseDto } from '@modules/user/dtos/response/user.censor.response.dto';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { UserUploadPhotoProfileRequestDto } from '@modules/user/dtos/request/user.upload-photo-profile.request.dto';

export interface IUserService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllAggregateOptions
    ): Promise<IUserEntity[]>;
    getTotalWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseAggregateOptions
    ): Promise<number>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<UserDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<UserDoc>;
    findOneByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;
    findOneByUsername(
        username: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;
    findOneByMobileNumberAndCountry(
        country: string,
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;
    findOneByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;

    findOneWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc>;
    findOneWithRoleAndCountryById(
        _id: string,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc>;
    findAllActiveWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]>;
    getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<IUserDoc>;
    findOneActiveByEmail(
        email: string,
        options?: IDatabaseOptions
    ): Promise<IUserDoc>;
    findOneActiveByMobileNumber(
        country: string,
        mobileNumber: string,
        options?: IDatabaseOptions
    ): Promise<IUserDoc>;
    create(
        { email, name, role, country }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc>;
    signUp(
        role: string,
        {
            email,
            name,
            country,
        }: Omit<AuthSignUpRequestDto, 'termPolicies' | 'password'>,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc>;
    existByRole(
        role: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    existByEmail(
        email: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    existByUsername(
        username: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    updatePhoto(
        repository: UserDoc,
        photo: AwsS3Dto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updatePassword(
        repository: UserDoc,
        { passwordHash, passwordExpired, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updateStatus(
        repository: UserDoc,
        { status }: UserUpdateStatusRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    updatePasswordAttempt(
        repository: UserDoc,
        { passwordAttempt }: UserUpdatePasswordAttemptRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    increasePasswordAttempt(
        repository: UserDoc,
        options?: IDatabaseUpdateOptions
    ): Promise<UserDoc>;
    resetPasswordAttempt(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updatePasswordExpired(
        repository: UserDoc,
        passwordExpired: Date,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    update(
        repository: UserDoc,
        { country, name, role }: UserUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updateMobileNumber(
        repository: UserDoc,
        { country, number }: UserUpdateMobileNumberRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updateClaimUsername(
        repository: UserDoc,
        { username }: UserUpdateClaimUsernameRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    removeMobileNumber(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    softDelete(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    updateProfile(
        repository: UserDoc,
        { country, name, gender }: UserUpdateProfileRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updateVerificationEmail(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updateVerificationMobileNumber(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    join(repository: UserDoc): Promise<IUserDoc>;
    createRandomFilenamePhoto(
        user: string,
        { mime }: UserUploadPhotoProfileRequestDto
    ): string;
    createRandomUsername(): string;
    checkUsernamePattern(username: string): boolean;
    checkUsernameBadWord(username: string): Promise<boolean>;
    mapProfile(user: IUserDoc | IUserEntity): UserProfileResponseDto;
    mapList(users: IUserDoc[] | IUserEntity[]): UserListResponseDto[];
    mapCensor(user: UserDoc | UserEntity): UserCensorResponseDto;
    mapShort(users: IUserDoc[] | IUserEntity[]): UserShortResponseDto[];
    mapGet(user: IUserDoc | IUserEntity): UserGetResponseDto;
    checkMobileNumber(mobileNumber: string, country: CountryDoc): boolean;
    acceptTermPolicy(
        repository: UserDoc,
        type: ENUM_TERM_POLICY_TYPE,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    releaseTermPolicy(
        type: ENUM_TERM_POLICY_TYPE,
        options?: IDatabaseUpdateManyOptions
    ): Promise<void>;
}
