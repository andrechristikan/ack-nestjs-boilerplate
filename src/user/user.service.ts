import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'user/user.schema';
import {
    IUser,
    IUserCreate,
    IUserSafe,
    IUserUpdate
} from 'user/user.interface';
import { HashService } from 'hash/hash.service';
import { Hash } from 'hash/hash.decorator';
import { UserTransformer } from 'user/transformer/user.transformer';
import { classToPlain, plainToClass } from 'class-transformer';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(UserEntity.name)
        private readonly userModel: Model<UserEntity>,
        @Hash() private readonly hashService: HashService
    ) {}

    async findAll(
        skip: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<IUser[]> {
        return this.userModel.find(find).skip(skip).limit(limit).lean();
    }

    async findOneById(userId: string): Promise<IUser> {
        return this.userModel.findById(userId).lean();
    }

    async findOneByEmail(email: string): Promise<IUser> {
        return this.userModel
            .findOne({
                email: email
            })
            .lean();
    }

    async findOneByMobileNumber(mobileNumber: string): Promise<IUser> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .lean();
    }

    async transformer(rawData: IUser): Promise<IUserSafe> {
        const user: UserTransformer = plainToClass(UserTransformer, rawData);
        return classToPlain(user) as IUserSafe;
    }

    async transformerMany(rawData: IUser[]): Promise<IUserSafe[]> {
        const user: UserTransformer[] = plainToClass(UserTransformer, rawData);
        return classToPlain(user) as IUserSafe[];
    }

    async create(data: IUserCreate): Promise<UserEntity> {
        const salt: string = await this.hashService.randomSalt();
        const passwordHash = await this.hashService.hashPassword(
            data.password,
            salt
        );
        const user: UserEntity = new this.userModel(data);
        user.firstName = data.firstName.toLowerCase();
        user.lastName = data.lastName.toLowerCase();
        user.email = data.email.toLowerCase();
        user.password = passwordHash;
        user.salt = salt;
        return user.save();
    }

    async deleteOneById(userId: string): Promise<UserEntity> {
        return this.userModel.findByIdAndDelete(userId).exec();
    }

    async updateOneById(
        userId: string,
        data: IUserUpdate
    ): Promise<UserEntity> {
        return this.userModel
            .findByIdAndUpdate(userId, {
                $set: {
                    firstName: data.firstName.toLowerCase(),
                    lastName: data.lastName.toLowerCase()
                }
            })
            .exec();
    }
}
