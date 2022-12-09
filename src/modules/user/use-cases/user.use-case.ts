import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { AwsS3Serialization } from 'src/common/aws/serializations/aws.s3.serialization';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserPasswordAttemptDto } from 'src/modules/user/dtos/user.password-attempt.dto';
import { UserPasswordDto } from 'src/modules/user/dtos/user.password.dto';
import { UserPhotoDto } from 'src/modules/user/dtos/user.photo.dto';
import { UserUpdateDto } from 'src/modules/user/dtos/user.update.dto';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserPayloadPermissionSerialization } from 'src/modules/user/serializations/user.payload-permission.serialization';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';

@Injectable()
export class UserUseCase {
    private readonly uploadPath: string;

    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.uploadPath = this.configService.get<string>('user.uploadPath');
    }

    async active(): Promise<UserActiveDto> {
        const dto: UserActiveDto = new UserActiveDto();
        dto.isActive = true;

        return dto;
    }

    async inactive(): Promise<UserActiveDto> {
        const dto: UserActiveDto = new UserActiveDto();
        dto.isActive = false;

        return dto;
    }

    async create(
        {
            username,
            firstName,
            lastName,
            email,
            mobileNumber,
            role,
        }: UserCreateDto,
        { passwordExpired, passwordHash, salt }: IAuthPassword
    ): Promise<UserEntity> {
        const create: UserEntity = new UserEntity();
        create.username = username;
        create.firstName = firstName;
        create.email = email;
        create.password = passwordHash;
        create.role = role;
        create.isActive = true;
        create.lastName = lastName;
        create.salt = salt;
        create.passwordExpired = passwordExpired;
        create.signUpDate = this.helperDateService.create();
        create.passwordAttempt = 0;
        create.mobileNumber = mobileNumber ?? undefined;

        return create;
    }

    async update(data: UserUpdateDto): Promise<UserUpdateDto> {
        return data;
    }

    async updatePhoto(photo: AwsS3Serialization): Promise<UserPhotoDto> {
        const update: UserPhotoDto = new UserPhotoDto();
        update.photo = photo;

        return update;
    }

    async createRandomFilename(): Promise<Record<string, any>> {
        const filename: string = this.helperStringService.random(20);

        return {
            path: this.uploadPath,
            filename: filename,
        };
    }

    async updatePassword({
        passwordHash,
        passwordExpired,
        salt,
    }: IAuthPassword): Promise<UserPasswordDto> {
        const update: UserPasswordDto = new UserPasswordDto();

        update.password = passwordHash;
        update.passwordExpired = passwordExpired;
        update.salt = salt;
        return update;
    }

    async updatePasswordExpired(
        passwordExpired: Date
    ): Promise<UserPasswordDto> {
        const update: UserPasswordDto = new UserPasswordDto();

        update.passwordExpired = passwordExpired;
        return update;
    }

    async payloadSerialization(
        data: IUserEntity
    ): Promise<UserPayloadSerialization> {
        return plainToInstance(UserPayloadSerialization, data);
    }

    async maxPasswordAttempt(): Promise<UserPasswordAttemptDto> {
        const update: UserPasswordAttemptDto = new UserPasswordAttemptDto();

        update.passwordAttempt = 3;
        return update;
    }

    async increasePasswordAttempt(
        user: UserEntity | IUserEntity
    ): Promise<UserPasswordAttemptDto> {
        const update: UserPasswordAttemptDto = new UserPasswordAttemptDto();

        update.passwordAttempt = ++user.passwordAttempt;
        return update;
    }

    async resetPasswordAttempt(): Promise<UserPasswordAttemptDto> {
        const update: UserPasswordAttemptDto = new UserPasswordAttemptDto();

        update.passwordAttempt = 0;
        return update;
    }

    async getPermissionByGroup(
        user: IUserEntity,
        scope: ENUM_PERMISSION_GROUP[]
    ): Promise<PermissionEntity[]> {
        return user.role.permissions.filter((val) => scope.includes(val.group));
    }

    async payloadPermissionSerialization(
        _id: string,
        permissions: PermissionEntity[]
    ): Promise<UserPayloadPermissionSerialization> {
        return plainToInstance(UserPayloadPermissionSerialization, {
            _id,
            permissions,
        });
    }
}
