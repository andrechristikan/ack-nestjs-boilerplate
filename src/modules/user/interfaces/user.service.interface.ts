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
import { UserSignUpRequestDto } from 'src/modules/user/dtos/request/user.sign-up.request.dto';
import { UserUpdateMobileNumberDto } from 'src/modules/user/dtos/request/user.update-mobile-number.dto';
import { UserUpdatePasswordAttemptRequestDto } from 'src/modules/user/dtos/request/user.update-password-attempt.request.dto';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.request.dto';
import { UserGetResponseDto } from 'src/modules/user/dtos/response/user.get.response.dto';
import { UserListResponseDto } from 'src/modules/user/dtos/response/user.list.response.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';

export interface IUserService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<UserDoc[]>;
    findAllWithRoleAndCountry(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDoc[]>;
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
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        { email, name, role, country }: UserCreateRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
        signUpFrom: ENUM_USER_SIGN_UP_FROM,
        options?: IDatabaseCreateOptions
    ): Promise<UserDoc>;
    signUp(
        role: string,
        { email, name, country }: UserSignUpRequestDto,
        { passwordExpired, passwordHash, salt, passwordCreated }: IAuthPassword,
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
    selfDelete(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    blocked(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    unblocked(
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
    joinWithRoleAndCountry(repository: UserDoc): Promise<IUserDoc>;
    getPhotoUploadPath(user: string): Promise<string>;
    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseManyOptions
    ): Promise<boolean>;
    findOneByIdAndActive(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc>;
    findOneByEmailAndActive(
        email: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc>;
    findOneByMobileNumberAndActive(
        mobileNumber: string,
        options?: IDatabaseFindOneOptions
    ): Promise<IUserDoc>;
    mapProfile(user: IUserDoc): Promise<UserProfileResponseDto>;
    updateProfile(
        repository: UserDoc,
        { name, familyName, address }: UserUpdateProfileRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    updateMobileNumber(
        repository: UserDoc,
        { country, number }: UserUpdateMobileNumberDto,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    deleteMobileNumber(
        repository: UserDoc,
        options?: IDatabaseSaveOptions
    ): Promise<UserDoc>;
    mapList(user: IUserDoc[]): Promise<UserListResponseDto[]>;
    mapGet(user: IUserDoc): Promise<UserGetResponseDto>;
}
