import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DatabaseEntity } from 'src/common/database/database.decorator';
import { UserDocument, UserEntity } from '../schemas/user.schema';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from 'src/common/database/database.interface';
import { IUserCheckExist, IUserCreate, IUserDocument } from '../user.interface';
import { RoleEntity } from 'src/modules/role/schemas/role.schema';
import { PermissionEntity } from 'src/modules/permission/schemas/permission.schema';
import { UserUpdateDto } from '../dtos/user.update.dto';
import { IAwsS3Response } from 'src/modules/aws/aws.interface';
import { IAuthPassword } from 'src/common/auth/auth.interface';

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
        passwordExpired,
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
            passwordExpired,
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
        { firstName, lastName }: UserUpdateDto
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
        { salt, passwordHash, passwordExpired }: IAuthPassword
    ): Promise<UserDocument> {
        const auth: UserDocument = await this.userModel.findById(_id);

        auth.password = passwordHash;
        auth.passwordExpired = passwordExpired;
        auth.salt = salt;

        return auth.save();
    }

    async updatePasswordExpired(
        _id: string,
        passwordExpired: Date
    ): Promise<UserDocument> {
        const auth: UserDocument = await this.userModel.findById(_id);
        auth.passwordExpired = passwordExpired;

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
