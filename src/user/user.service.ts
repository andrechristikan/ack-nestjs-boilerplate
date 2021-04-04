import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserEntity } from 'src/user/user.schema';
import { IUser, UserEntityWithRole } from 'src/user/user.interface';
import { HashService } from 'src/hash/hash.service';
import { Hash } from 'src/hash/hash.decorator';
import { UserTransformer } from 'src/user/transformer/user.transformer';
import { classToPlain, plainToClass } from 'class-transformer';
import { IErrors } from 'src/message/message.interface';
import { MessageService } from 'src/message/message.service';
import { Message } from 'src/message/message.decorator';
import { RoleEntity } from 'src/role/role.schema';
import { IRole } from 'src/role/role.interface';
import { IAbility } from 'src/ability/ability.interface';
import { AbilityEntity } from 'src/ability/ability.schema';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(UserEntity.name)
        private readonly userModel: Model<IUser>,
        @InjectModel(RoleEntity.name)
        private readonly roleModel: Model<IRole>,
        @InjectModel(AbilityEntity.name)
        private readonly abilityModel: Model<IAbility>,
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

    async findOneById(userId: string): Promise<UserEntity> {
        return this.userModel.findById(userId).lean();
    }

    async findOneByIdWithRole(userId: string): Promise<UserEntityWithRole> {
        return this.userModel
            .findById(userId)
            .populate({
                path: 'roleId',
                model: this.roleModel,
                populate: {
                    path: 'abilities',
                    model: this.abilityModel
                }
            })
            .lean();
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
