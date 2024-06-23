import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AwsS3Dto } from 'src/common/aws/dtos/aws.s3.dto';
import {
    IDatabaseCreateOptions,
    IDatabaseExistOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseManyOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_USER_SIGN_UP_FROM } from 'src/modules/user/constants/user.enum.constant';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { UserUpdatePasswordAttemptRequestDto } from 'src/modules/user/dtos/request/user.update-password-attempt.request.dto';
import { UserUpdateRequestDto } from 'src/modules/user/dtos/request/user.update.request.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { UserShortResponseDto } from 'src/modules/user/dtos/response/user.short.response.dto';
import {
    IUserDoc,
    IUserEntity,
} from 'src/modules/user/interfaces/user.interface';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

export interface IUserService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findAllActive(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]>;
    findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]>;
    findAllActiveWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]>;
    getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;
    findOneByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;
    findOneByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<UserDoc>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc>;
    findOneActiveByEmail(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc>;
    findOneActiveByMobileNumber(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc>;
    findOneWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc>;
    findOneWithRoleAndCountryById(
        _id: string,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc>;
    create(
        { email, name, role, country }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc>;
    existByEmail(
        email: string,
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
        options?: IDatabaseSaveOptions
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
    join(repository: UserDoc): Promise<IUserDoc>;
    getPhotoUploadPath(user: string): Promise<string>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
    update(
        repository: UserDoc,
        { country, name }: UserUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updateMobileNumber(
        repository: UserDoc,
        { country, number }: UserUpdateMobileNumberRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    deleteMobileNumber(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    mapProfile(user: IUserDoc | IUserEntity): Promise<UserProfileResponseDto>;
    mapList(users: IUserDoc[] | IUserEntity[]): Promise<UserListResponseDto[]>;
    mapShort(
        users: IUserDoc[] | IUserEntity[]
    ): Promise<UserShortResponseDto[]>;
    mapGet(user: IUserDoc | IUserEntity): Promise<UserGetResponseDto>;
}
