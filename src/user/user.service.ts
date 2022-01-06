import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'src/user/user.schema';
import {
    UserDocument,
    IUserDocument,
    IUserCreate,
    IUserUpdate,
    IUserCheckExist
} from 'src/user/user.interface';
import { RoleEntity } from 'src/role/role.schema';
import { PermissionEntity } from 'src/permission/permission.schema';
import { Types } from 'mongoose';
import { UserProfileTransformer } from './transformer/user.profile.transformer';
import { plainToInstance } from 'class-transformer';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';
import { IAwsResponse } from 'src/aws/aws.interface';
import { UserListTransformer } from './transformer/user.list.transformer';
import { UserGetTransformer } from './transformer/user.get.transformer';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(UserEntity.name)
        private readonly userModel: Model<UserDocument>,
        @Helper() private readonly helperService: HelperService
    ) {}

    async findAll(
        find?: Record<string, any>,
        options?: Record<string, any>
    ): Promise<IUserDocument[]> {
        const users = this.userModel.find(find).populate({
            path: 'role',
            model: RoleEntity.name
        });

        if (options && options.limit && options.skip) {
            users
                .limit(options.limit)
                .skip(options && options.skip ? options.skip : 0);
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
        options?: Record<string, any>
    ): Promise<T> {
        const user = this.userModel.findById(_id);

        if (options && options.populate && options.populate.role) {
            user.populate({
                path: 'role',
                model: RoleEntity.name
            });

            if (options.populate.permission) {
                user.populate({
                    path: 'role',
                    model: RoleEntity.name,
                    populate: {
                        path: 'permissions',
                        model: PermissionEntity.name
                    }
                });
            }
        }

        return user.lean();
    }

    async findOne<T>(
        find?: Record<string, any>,
        options?: Record<string, any>
    ): Promise<T> {
        const user = this.userModel.findOne(find);

        if (options && options.populate && options.populate.role) {
            user.populate({
                path: 'role',
                model: RoleEntity.name
            });

            if (options.populate.permission) {
                user.populate({
                    path: 'role',
                    model: RoleEntity.name,
                    populate: {
                        path: 'permissions',
                        model: PermissionEntity.name
                    }
                });
            }
        }

        return user.lean();
    }

    async create({
        firstName,
        lastName,
        password,
        email,
        mobileNumber,
        role
    }: IUserCreate): Promise<UserDocument> {
        const salt: string = await this.helperService.randomSalt();
        const passwordHash = await this.helperService.bcryptHashPassword(
            password,
            salt
        );

        const user: UserEntity = {
            firstName,
            email,
            mobileNumber,
            password: passwordHash,
            role: new Types.ObjectId(role),
            isActive: true,
            lastName: lastName || undefined
        };

        const create: UserDocument = new this.userModel(user);
        return create.save();
    }

    async deleteOneById(_id: string): Promise<boolean> {
        try {
            await this.userModel.deleteOne({
                _id: new Types.ObjectId(_id)
            });
            return true;
        } catch (e: unknown) {
            return false;
        }
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
        const existEmail: UserDocument = await this.userModel
            .findOne({
                email
            })
            .where('_id')
            .ne(new Types.ObjectId(_id))
            .lean();

        const existMobileNumber: UserDocument = await this.userModel
            .findOne({
                mobileNumber
            })
            .where('_id')
            .ne(new Types.ObjectId(_id))
            .lean();

        return {
            email: existEmail ? true : false,
            mobileNumber: existMobileNumber ? true : false
        };
    }

    async deleteMany(find: Record<string, any>): Promise<boolean> {
        try {
            await this.userModel.deleteMany(find);
            return true;
        } catch (e: unknown) {
            return false;
        }
    }

    async updatePhoto(_id: string, aws: IAwsResponse): Promise<UserDocument> {
        const user: UserDocument = await this.userModel.findById(_id);
        user.photo = aws;

        return user.save();
    }

    async createRandomFilename(): Promise<string> {
        return this.helperService.randomString(20);
    }
}
