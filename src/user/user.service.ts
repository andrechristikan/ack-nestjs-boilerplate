import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserEntity } from 'user/user.schema';
import {
    IUserCreate,
    IUserUpdate,
} from 'user/user.interface';

import { Helper } from 'helper/helper.decorator';
import { HelperService } from 'helper/helper.service';

@Injectable()
export class UserService {
    constructor(
        @Helper() private helperService: HelperService,
        @InjectModel('user') private userModel: Model<UserEntity>
    ) {}

    async getAll(
        skip: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<UserEntity[]> {
        return this.userModel
            .find(find)
            .select('-password')
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async getOneById(id: string): Promise<UserEntity> {
        return this.userModel.findById(id).exec();
    }

    async getOneByEmail(email: string): Promise<UserEntity> {
        return this.userModel
            .findOne({
                email: email
            })
            .exec();
    }

    async getOneByMobileNumber(mobileNumber: string): Promise<UserEntity> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .exec();
    }

    async create(data: IUserCreate): Promise<UserEntity> {
        const salt: string = await this.helperService.randomSalt();
        const passwordHash = await this.helperService.hashPassword(
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

    async delete(id: string): Promise<UserEntity> {
        return this.userModel.findByIdAndDelete(id).exec();
    }

    async update(id: string, data: IUserUpdate): Promise<UserEntity> {
        const user: UserEntity = await this.getOneById(id);
        user.firstName = data.firstName.toLowerCase();
        user.lastName = data.lastName.toLowerCase();
        return user.save();
    }

}
