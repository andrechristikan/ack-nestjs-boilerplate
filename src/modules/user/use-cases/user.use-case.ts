import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateDto } from 'src/common/setting/dtos/setting.update.dto';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionActiveDto } from 'src/modules/permission/dtos/permission.active.dto';
import { PermissionCreateDto } from 'src/modules/permission/dtos/permission.create.dto';
import { PermissionGroupDto } from 'src/modules/permission/dtos/permission.group.dto';
import { PermissionUpdateGroupDto } from 'src/modules/permission/dtos/permission.update-group.dto';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { IPermissionGroup } from 'src/modules/permission/interfaces/permission.interface';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { RoleActiveDto } from 'src/modules/role/dtos/role.active.dto';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { RoleUpdateDto } from 'src/modules/role/dtos/role.update.dto';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { UserCreateDto } from 'src/modules/user/dtos/user.create.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserUseCase {
    constructor(private readonly helperDateService: HelperDateService) {}

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

    async update(data: RoleUpdateDto): Promise<RoleUpdateDto> {
        return this.userRepository.updateOneById<UserUpdateDto>(
            _id,
            data,
            options
        );
    }

    async updatePhoto() {
        const update: UserPhotoDto = {
            photo: aws,
        };
    }

    async createRandomFilename(): Promise<Record<string, any>> {
        const filename: string = this.helperStringService.random(20);

        return {
            path: this.uploadPath,
            filename: filename,
        };
    }

    async updatePassword(
        _id: string,
        { salt, passwordHash, passwordExpired }: IAuthPassword,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserPasswordDto = {
            password: passwordHash,
            passwordExpired: passwordExpired,
            salt: salt,
        };

        return this.userRepository.updateOneById<UserPasswordDto>(
            _id,
            update,
            options
        );
    }

    async updatePasswordExpired(
        _id: string,
        passwordExpired: Date,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update: UserPasswordExpiredDto = {
            passwordExpired: passwordExpired,
        };

        return this.userRepository.updateOneById<UserPasswordExpiredDto>(
            _id,
            update,
            options
        );
    }

    async payloadSerialization(
        data: IUserEntity
    ): Promise<UserPayloadSerialization> {
        return plainToInstance(UserPayloadSerialization, data);
    }

    async increasePasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const user: UserEntity = await this.userRepository.findOneById(
            _id,
            options
        );

        const update = {
            passwordAttempt: ++user.passwordAttempt,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async resetPasswordAttempt(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<UserEntity> {
        const update = {
            passwordAttempt: 0,
        };

        return this.userRepository.updateOneById(_id, update, options);
    }

    async getPermissionByGroup(
        _id: string,
        scope: ENUM_PERMISSION_GROUP[]
    ): Promise<PermissionEntity[]> {
        const user: IUserEntity = await this.userRepository.findOneById(_id, {
            join: true,
        });

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
