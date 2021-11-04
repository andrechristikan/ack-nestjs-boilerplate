import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'src/user/user.schema';
import {
    UserDocument,
    IUserDocument,
    IUserCreate,
    IUserUpdate
} from 'src/user/user.interface';
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

        if (options && options.sort) {
            findAll.sort(options.sort);
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

    async findOneById<T>(
        _id: string,
        options?: Record<string, any>
    ): Promise<T> {
        const user = this.userModel.findById(_id);

        if (options && options.populate) {
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
        options?: Record<string, any>
    ): Promise<T> {
        const user = this.userModel.findOne(find);

        if (options && options.populate) {
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

        const newUser: UserEntity = {
            firstName: firstName.toLowerCase(),
            email: email.toLowerCase(),
            mobileNumber: mobileNumber,
            password: passwordHash,
            role: Types.ObjectId(role)
        };

        if (lastName) {
            newUser.lastName = lastName.toLowerCase();
        }

        const create: UserDocument = new this.userModel(newUser);
        return create.save();
    }

    async deleteOneById(_id: string): Promise<boolean> {
        try {
            this.userModel.deleteOne({
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
        return this.userModel.updateOne(
            {
                _id: new Types.ObjectId(_id)
            },
            {
                firstName: firstName.toLowerCase(),
                lastName: lastName.toLowerCase()
            }
        );
    }

    async checkExist(
        email: string,
        mobileNumber: string,
        _id?: string
    ): Promise<IErrors[]> {
        const existEmail: UserDocument = await this.userModel
            .findOne({
                email: email
            })
            .where('_id')
            .ne(new Types.ObjectId(_id))
            .lean();

        const existMobileNumber: UserDocument = await this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .where('_id')
            .ne(new Types.ObjectId(_id))
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
