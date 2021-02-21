import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument, UserEntity } from 'src/user/user.schema';
import { IUserCreate, IUserUpdate } from 'src/user/user.interface';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';
import { UserTransformer } from 'src/user/transformer/user.transformer';
import { classToPlain, plainToClass } from 'class-transformer';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(UserEntity.name)
        private readonly userModel: Model<UserDocument>,
        @Hash() private readonly hashService: HashService
    ) {}

    async findAll(
        skip: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<UserEntity[]> {
        return this.userModel.find(find).skip(skip).limit(limit).lean();
    }

    async findOneById(userId: string): Promise<UserEntity> {
        return this.userModel.findById(userId).lean();
    }

    async findOneByEmail(email: string): Promise<UserEntity> {
        return this.userModel
            .findOne({
                email: email
            })
            .lean();
    }

    async findOneByMobileNumber(mobileNumber: string): Promise<UserEntity> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .lean();
    }

    async transformer<T, U>(rawData: U): Promise<T> {
        const user: UserTransformer = plainToClass(UserTransformer, rawData);
        return classToPlain(user) as T;
    }

    async create(data: IUserCreate): Promise<UserEntity> {
        const salt: string = await this.hashService.randomSalt();
        const passwordHash = await this.hashService.hashPassword(
            data.password,
            salt
        );
        const create: UserDocument = await this.userModel.create({
            firstName: data.firstName.toLowerCase(),
            lastName: data.lastName.toLowerCase(),
            email: data.email.toLowerCase(),
            mobileNumber: data.mobileNumber,
            password: passwordHash
        });
        return create.toObject() as UserEntity;
    }

    async deleteOneById(userId: string): Promise<UserEntity> {
        return this.userModel.findByIdAndDelete(userId);
    }

    async updateOneById(
        userId: string,
        data: IUserUpdate
    ): Promise<UserEntity> {
        const update: UserDocument = await this.userModel.findByIdAndUpdate(
            userId,
            {
                $set: {
                    firstName: data.firstName.toLowerCase(),
                    lastName: data.lastName.toLowerCase()
                }
            },
            { new: true }
        );

        return update.toObject() as UserEntity;
    }
}
