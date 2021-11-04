import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'src/user/user.schema';
import { UserDocument, IUserDocument } from 'src/user/user.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { RoleEntity } from 'src/role/role.schema';
import { PermissionEntity } from 'src/permission/permission.schema';
import { Types } from 'mongoose';
import { UserProfileTransformer } from './transformer/user.profile.transformer';
import { plainToClass } from 'class-transformer';
import { UserLoginTransformer } from './transformer/user.login.transformer';
import { Helper } from 'src/helper/helper.decorator';
import { HelperService } from 'src/helper/helper.service';
import { IErrors } from 'src/error/error.interface';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(UserEntity.name)
        private readonly userModel: Model<UserDocument>,
        @Helper() private readonly helperService: HelperService,
        @Message() private readonly messageService: MessageService
    ) {}

    async findAll<T>(
        find?: Record<string, any>,
        options?: Record<string, any>
    ): Promise<T[]> {
        const findAll = this.userModel
            .find(find)
            .skip(options && options.skip ? options.skip : 0);

        if (options && options.limit) {
            findAll.limit(options.limit);
        }

        if (options && options.populate) {
            findAll.populate({
                path: 'role',
                model: RoleEntity.name,
                match: { isActive: true },
                populate: {
                    path: 'permissions',
                    model: PermissionEntity.name,
                    match: { isActive: true }
                }
            });
        }

        return findAll.lean();
    }

    async getTotalData(find?: Record<string, any>): Promise<number> {
        return this.userModel.countDocuments(find);
    }

    async mapProfile(data: IUserDocument): Promise<UserProfileTransformer> {
        return plainToClass(UserProfileTransformer, data);
    }

    async mapLogin(data: IUserDocument): Promise<UserLoginTransformer> {
        return plainToClass(UserLoginTransformer, data);
    }

    async findOneById<T>(userId: string, populate?: boolean): Promise<T> {
        const user = this.userModel.findById(userId);

        if (populate) {
            user.populate({
                path: 'role',
                model: RoleEntity.name,
                match: { isActive: true },
                populate: {
                    path: 'permissions',
                    model: PermissionEntity.name,
                    match: { isActive: true }
                }
            });
        }

        return user.lean();
    }

    async findOne<T>(
        find?: Record<string, any>,
        populate?: boolean
    ): Promise<T> {
        const user = this.userModel.findOne(find);

        if (populate) {
            user.populate({
                path: 'role',
                match: { isActive: true },
                model: RoleEntity.name,
                populate: {
                    path: 'permissions',
                    match: { isActive: true },
                    model: PermissionEntity.name
                }
            });
        }

        return user.lean();
    }

    async create(data: Record<string, any>): Promise<UserDocument> {
        const salt: string = await this.helperService.randomSalt();
        const passwordHash = await this.helperService.bcryptHashPassword(
            data.password,
            salt
        );

        const newUser: UserEntity = {
            firstName: data.firstName.toLowerCase(),
            email: data.email.toLowerCase(),
            mobileNumber: data.mobileNumber,
            password: passwordHash,
            role: Types.ObjectId(data.role)
        };

        if (data.lastName) {
            newUser.lastName = data.lastName.toLowerCase();
        }

        const create: UserDocument = new this.userModel(newUser);
        return create.save();
    }

    async deleteOneById(userId: string): Promise<boolean> {
        try {
            this.userModel.deleteOne({
                _id: userId
            });
            return true;
        } catch (e: unknown) {
            return false;
        }
    }

    async updateOneById(
        userId: string,
        data: Record<string, any>
    ): Promise<UserDocument> {
        return this.userModel.updateOne(
            {
                _id: userId
            },
            {
                firstName: data.firstName.toLowerCase(),
                lastName: data.lastName.toLowerCase()
            }
        );
    }

    async checkExist(
        email: string,
        mobileNumber: string,
        userId?: string
    ): Promise<IErrors[]> {
        const existEmail: UserDocument = await this.userModel
            .findOne({
                email: email
            })
            .where('_id')
            .ne(userId)
            .lean();

        const existMobileNumber: UserDocument = await this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .where('_id')
            .ne(userId)
            .lean();

        const errors: IErrors[] = [];
        if (existEmail) {
            errors.push({
                message: this.messageService.get('user.error.emailExist'),
                property: 'email'
            });
        }
        if (existMobileNumber) {
            errors.push({
                message: this.messageService.get(
                    'user.error.mobileNumberExist'
                ),
                property: 'mobileNumber'
            });
        }

        return errors;
    }

    async deleteMany(find: Record<string, any>): Promise<boolean> {
        try {
            await this.userModel.deleteMany(find);
            return true;
        } catch (e: unknown) {
            return false;
        }
    }
}
