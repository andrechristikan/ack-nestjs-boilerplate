import { IAuthPassword } from 'src/modules/auth/interfaces/auth.interface';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';
import {
    IUserDoc,
    IUserEntity,
} from 'src/modules/user/interfaces/user.interface';
import { UserUpdatePasswordAttemptRequestDto } from 'src/modules/user/dtos/request/user.update-password-attempt.request.dto';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/enums/user.enum';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';
import { UserUpdateClaimUsernameRequestDto } from 'src/modules/user/dtos/request/user.update-claim-username.dto';
import { DatabaseSoftDeleteDto } from 'src/common/database/dtos/database.soft-delete.dto';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.dto';

export interface IUserService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<UserDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<UserDoc>;
    findOneByEmail(email: string, options?: IDatabaseOptions): Promise<UserDoc>;
    findOneByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseOptions
    ): Promise<UserDoc>;
    findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]>;
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
        { email, name, country }: AuthSignUpRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc>;
    existByEmail(
        email: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;
    existByUsername(
        username: string,
        options?: IDatabaseExistOptions
    ): Promise<boolean>;
    existByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseExistOptions
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
    active(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserEntity>;
    inactive(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    blocked(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
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
    delete(
        repository: UserDoc,
        dto: DatabaseSoftDeleteDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    updateProfile(
        repository: UserDoc,
        { country, name, address, familyName }: UserUpdateProfileRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    join(repository: UserDoc): Promise<IUserDoc>;
    getPhotoUploadPath(user: string): Promise<string>;
    mapProfile(user: IUserDoc | IUserEntity): Promise<UserProfileResponseDto>;
    createRandomFilenamePhoto(): Promise<string>;
    createRandomUsername(): Promise<string>;
    checkUsername(username: string): Promise<boolean>;
    mapList(users: IUserDoc[] | IUserEntity[]): Promise<UserListResponseDto[]>;
    mapShort(
        users: IUserDoc[] | IUserEntity[]
    ): Promise<UserShortResponseDto[]>;
    mapGet(user: IUserDoc | IUserEntity): Promise<UserGetResponseDto>;
}
