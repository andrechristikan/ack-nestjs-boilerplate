import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import {
    IUserDocument,
    IUserCreate,
    IUserUpdate,
    IUserCheckExist,
} from 'src/user/user.interface';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { IAwsS3Response } from 'src/aws/aws.interface';
import { IAuthPassword } from 'src/auth/auth.interface';
import { ConfigService } from '@nestjs/config';
import { DatabaseEntity } from 'src/database/database.decorator';
import { UserProfileTransformer } from '../transformer/user.profile.transformer';
import { UserGetTransformer } from '../transformer/user.get.transformer';
import { UserListTransformer } from '../transformer/user.list.transformer';
import { HelperStringService } from 'src/utils/helper/service/helper.string.service';
import { UserDocument, UserEntity } from '../schema/user.schema';
import { RoleEntity } from 'src/role/schema/role.schema';
import { PermissionEntity } from 'src/permission/schema/permission.schema';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from 'src/database/database.interface';

@Injectable()
export class UserService {
    private readonly uploadPath: string;

    constructor(
        @DatabaseEntity(UserEntity.name)
        private readonly userModel: Model<UserDocument>,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService
    ) {
        this.uploadPath = this.configService.get<string>('user.uploadPath');
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IUserDocument[]> {
        const users = this.userModel.find(find).populate({
            path: 'role',
            model: RoleEntity.name,
        });

        if (
            options &&
            options.limit !== undefined &&
            options.skip !== undefined
        ) {
            users.limit(options.limit).skip(options.skip);
        }

        if (options && options.sort) {
            users.sort(options.sort);
        }

        return users.lean();
    }

    async getTotal(find?: Record<string, any>): Promise<number> {
        return this.userModel.countDocuments(find);
    }

    async mapProfile(data: IUserDocument): Promise<UserProfileTransformer> {
        return plainToInstance(UserProfileTransformer, data);
    }

    async mapList(data: IUserDocument[]): Promise<UserListTransformer[]> {
        return plainToInstance(UserListTransformer, data);
    }

    async mapGet(data: IUserDocument): Promise<UserGetTransformer> {
        return plainToInstance(UserGetTransformer, data);
    }

    async findOneById<T>(
        _id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const user = this.userModel.findById(_id);

        if (options && options.populate && options.populate.role) {
            user.populate({
                path: 'role',
                model: RoleEntity.name,
            });

            if (options.populate.permission) {
                user.populate({
                    path: 'role',
                    model: RoleEntity.name,
                    populate: {
                        path: 'permissions',
                        model: PermissionEntity.name,
                    },
                });
            }
        }

        return user.lean();
    }

    async findOne<T>(
        find?: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<T> {
        const user = this.userModel.findOne(find);

        if (options && options.populate && options.populate.role) {
            user.populate({
                path: 'role',
                model: RoleEntity.name,
            });

            if (options.populate.permission) {
                user.populate({
                    path: 'role',
                    model: RoleEntity.name,
                    populate: {
                        path: 'permissions',
                        model: PermissionEntity.name,
                    },
                });
            }
        }

        return user.lean();
    }

    async create({
        firstName,
        lastName,
        password,
        passwordExpiredDate,
        salt,
        email,
        mobileNumber,
        role,
    }: IUserCreate): Promise<UserDocument> {
        const user: UserEntity = {
            firstName,
            email,
            mobileNumber,
            password,
            role: new Types.ObjectId(role),
            isActive: true,
            lastName: lastName || undefined,
            salt,
            passwordExpiredDate,
        };

        const create: UserDocument = new this.userModel(user);
        return create.save();
    }

    async deleteOneById(_id: string): Promise<UserDocument> {
        return this.userModel.findByIdAndDelete(_id);
    }

    async deleteOne(find: Record<string, any>): Promise<UserDocument> {
        return this.userModel.findOneAndDelete(find);
    }

    async updateOneById(
        _id: string,
        { firstName, lastName }: IUserUpdate
    ): Promise<UserDocument> {
        const user: UserDocument = await this.userModel.findById(_id);

        user.firstName = firstName;
        user.lastName = lastName || undefined;

        return user.save();
    }

    async checkExist(
        email: string,
        mobileNumber: string,
        _id?: string
    ): Promise<IUserCheckExist> {
        const existEmail: Record<string, any> = await this.userModel.exists({
            email: {
                $regex: new RegExp(email),
                $options: 'i',
            },
            _id: { $nin: [new Types.ObjectId(_id)] },
        });

        const existMobileNumber: Record<string, any> =
            await this.userModel.exists({
                mobileNumber,
                _id: { $nin: [new Types.ObjectId(_id)] },
            });

        return {
            email: existEmail ? true : false,
            mobileNumber: existMobileNumber ? true : false,
        };
    }

    async updatePhoto(_id: string, aws: IAwsS3Response): Promise<UserDocument> {
        const user: UserDocument = await this.userModel.findById(_id);
        user.photo = aws;

        return user.save();
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
        { salt, passwordHash, passwordExpiredDate }: IAuthPassword
    ): Promise<UserDocument> {
        const auth: UserDocument = await this.userModel.findById(_id);

        auth.password = passwordHash;
        auth.passwordExpiredDate = passwordExpiredDate;
        auth.salt = salt;

        return auth.save();
    }

    async updatePasswordExpired(
        _id: string,
        passwordExpiredDate: Date
    ): Promise<UserDocument> {
        const auth: UserDocument = await this.userModel.findById(_id);
        auth.passwordExpiredDate = passwordExpiredDate;

        return auth.save();
    }

    async inactive(_id: string): Promise<UserDocument> {
        const user: UserDocument = await this.userModel.findById(_id);

        user.isActive = false;
        return user.save();
    }

    async active(_id: string): Promise<UserDocument> {
        const user: UserDocument = await this.userModel.findById(_id);

        user.isActive = true;
        return user.save();
    }
}
