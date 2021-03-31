import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'src/user/user.schema';
import { IUser } from 'src/user/user.interface';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';
import { UserTransformer } from 'src/user/transformer/user.transformer';
import { classToPlain, plainToClass } from 'class-transformer';
import { IErrors } from 'src/message/message.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(UserEntity.name)
        private readonly userModel: Model<IUser>,
        @Hash() private readonly hashService: HashService,
        @Message() private readonly messageService: MessageService
    ) {}

    async findAll(
        offset: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<UserEntity[]> {
        return this.userModel.find(find).skip(offset).limit(limit).lean();
    }

    async totalData(find?: Record<string, any>): Promise<number> {
        return this.userModel.countDocuments(find);
    }

    async findOneById(userId: string): Promise<IUser> {
        return this.userModel.findById(userId).exec();
    }

    async findOneByEmail(email: string): Promise<IUser> {
        return this.userModel
            .findOne({
                email: email
            })
            .exec();
    }

    async findOneByMobileNumber(mobileNumber: string): Promise<IUser> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .exec();
    }

    async transformer<T, U>(rawData: U): Promise<T> {
        const user: UserTransformer = plainToClass(UserTransformer, rawData);
        return classToPlain(user) as T;
    }

    async create(data: Record<string, any>): Promise<IUser> {
        const salt: string = await this.hashService.randomSalt();
        const passwordHash = await this.hashService.hashPassword(
            data.password,
            salt
        );

        const create: IUser = new this.userModel({
            firstName: data.firstName.toLowerCase(),
            lastName: data.lastName.toLowerCase(),
            email: data.email.toLowerCase(),
            mobileNumber: data.mobileNumber,
            password: passwordHash
        });
        return create.save();
    }

    async deleteOneById(userId: string): Promise<IUser> {
        return this.userModel.deleteOne({
            _id: userId
        });
    }

    async updateOneById(
        userId: string,
        data: Record<string, any>
    ): Promise<IUser> {
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
        const existEmail: IUser = await this.userModel
            .findOne({
                email: email
            })
            .where('_id')
            .ne(userId)
            .lean();

        const existMobileNumber: IUser = await this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .where('_id')
            .ne(userId)
            .lean();

        const errors: IErrors[] = [];
        if (existEmail) {
            errors.push({
                message: this.messageService.get('user.create.emailExist'),
                property: 'email'
            });
        }
        if (existMobileNumber) {
            errors.push({
                message: this.messageService.get(
                    'user.create.mobileNumberExist'
                ),
                property: 'mobileNumber'
            });
        }

        return errors;
    }
}
