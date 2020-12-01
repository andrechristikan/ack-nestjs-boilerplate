import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from 'user/user.schema';
import {
    IUserStore,
    IUserUpdate,
    IUserSearch,
    IUserSearchFind
} from 'user/user.interface';

import { Helper } from 'helper/helper.decorator';
import { HelperService } from 'helper/helper.service';

@Injectable()
export class UserService {
    constructor(
        @Helper() private helperService: HelperService,
        @InjectModel('user') private userModel: Model<User>
    ) {}

    async getAll(
        skip: number,
        limit: number,
        find?: Record<string, any>
    ): Promise<User[]> {
        return this.userModel
            .find(find)
            .select('-password')
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async getOneById(id: string): Promise<User> {
        return this.userModel.findById(id).exec();
    }

    async getOneByEmail(email: string): Promise<User> {
        return this.userModel
            .findOne({
                email: email
            })
            .exec();
    }

    async getOneByMobileNumber(mobileNumber: string): Promise<User> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber
            })
            .exec();
    }

    async store(data: IUserStore): Promise<User> {
        const { password, salt } = await this.helperService.hashPassword(
            data.password
        );
        const user: User = new this.userModel(data);
        user.firstName = data.firstName.toLowerCase();
        user.lastName = data.lastName.toLowerCase();
        user.email = data.email.toLowerCase();
        user.password = password;
        user.salt = salt;
        return user.save();
    }

    async destroy(id: string): Promise<User> {
        return this.userModel.findByIdAndDelete(id).exec();
    }

    async update(id: string, data: IUserUpdate): Promise<User> {
        const user: User = await this.getOneById(id);
        user.firstName = data.firstName.toLowerCase();
        user.lastName = data.lastName.toLowerCase();
        return user.save();
    }

    async search(data: IUserSearch): Promise<IUserSearchFind> {
        const search: IUserSearchFind = {};
        if (data.firstName) {
            search.firstName = {
                $regex: `.*${data.firstName}.*`,
                $options: 'i'
            };
        }
        if (data.lastName) {
            search.lastName = { $regex: `.*${data.lastName}.*`, $options: 'i' };
        }
        if (data.mobileNumber) {
            search.mobileNumber = data.mobileNumber;
        }
        if (data.email) {
            search.email = { $regex: `.*${data.email}.*`, $options: 'i' };
        }
        return search;
    }
}
