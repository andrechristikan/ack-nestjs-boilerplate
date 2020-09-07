import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from 'user/user.model';
import { UserStore, UserUpdate, UserSearch } from 'user/user.constant';
import { AuthService } from 'auth/auth.service';

@Injectable()
export class UserService {
    constructor(
        @InjectModel('users') private userModel: Model<User>,
        private readonly authService: AuthService,
    ) {}

    async getAll(
        skip: number,
        limit: number,
        search?: UserSearch,
    ): Promise<User[]> {
        return this.userModel
            .find(search)
            .select('-password')
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async getOneById(id: string, full?: boolean): Promise<User> {
        if (!full) {
            this.userModel
                .findById(id)
                .select('-password')
                .exec();
        }
        return this.userModel.findById(id).exec();
    }

    async getOneByEmail(email: string): Promise<User> {
        return this.userModel
            .findOne({
                email: email.toLowerCase(),
            })
            .exec();
    }

    async getOneByMobileNumber(mobileNumber: string): Promise<User> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber,
            })
            .exec();
    }

    async store(data: UserStore): Promise<User> {
        data.password = await this.authService.hashPassword(data.password);
        data.email = data.email.toLowerCase();
        data.firstName = data.firstName.toLowerCase();
        data.lastName = data.lastName.toLowerCase();

        const user: User = new this.userModel(data);
        return user.save();
    }

    async destroy(id: string): Promise<User> {
        return this.userModel.findByIdAndDelete(id).exec();
    }

    async update(id: string, data: UserUpdate): Promise<User> {
        const user: User = await this.getOneById(id);
        user.firstName = data.firstName.toLowerCase();
        user.lastName = data.lastName.toLowerCase();
        return user.save();
    }

    async search(data: UserSearch): Promise<UserSearch> {
        const search: UserSearch = {};
        if (data.firstName) {
            search.firstName = {
                $regex: `.*${data.firstName}.*`,
                $options: 'i',
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
