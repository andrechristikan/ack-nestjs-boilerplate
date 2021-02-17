import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'src/user/user.schema';
import {
    IUser,
    IUserCreate,
    IUserSafe,
    IUserUpdate
} from 'src/user/user.interface';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';
import { UserTransformer } from 'src/user/transformer/user.transformer';
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
        return this.userModel.create({
            firstName: data.firstName.toLowerCase(),
            lastName: data.lastName.toLowerCase(),
            email: data.email.toLowerCase(),
            mobileNumber: data.mobileNumber,
            password: passwordHash,
            salt: salt
        });
    }

    async deleteOneById(userId: string): Promise<UserEntity> {
        return this.userModel
            .deleteOne({
                _id: userId
            })
            .exec();
    }

    async updateOneById(
        userId: string,
        data: IUserUpdate
    ): Promise<UserEntity> {
        return this.userModel
            .updateOne(
                {
                    _id: userId
                },
                {
                    $set: {
                        firstName: data.firstName.toLowerCase(),
                        lastName: data.lastName.toLowerCase()
                    }
                }
            )
            .exec();
    }
}
