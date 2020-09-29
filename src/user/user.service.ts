import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as SchemaMongoose } from 'mongoose';

import { User } from 'user/user.schema';
import { Country } from 'country/country.schema';
import {
    IUserStore,
    IUserUpdate,
    IUserSearch,
    IUserSearchCollection
} from 'user/user.interface';
import { AuthService } from 'auth/auth.service';

@Injectable()
export class UserService {
    constructor(
        @InjectModel('user') private userModel: Model<User>,
        @InjectModel('country') private readonly countryModel: Model<Country>,
        private readonly authService: AuthService
    ) {}

    async getAll(
        skip: number,
        limit: number,
        search?: IUserSearchCollection
    ): Promise<User[]> {
        return this.userModel
            .find(search)
            .select('-password')
            .populate('country', '-countryName -_id', this.countryModel)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async getOneById(id: string): Promise<User> {
        return this.userModel
            .findById(id)
            .populate('country', '-countryName -_id', this.countryModel)
            .exec();
    }

    async getOneByEmail(email: string): Promise<User> {
        return this.userModel
            .findOne({
                email: {
                    $regex: `.*${email}.*`,
                    $options: 'i'
                }
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
        const { password, salt } = await this.authService.hashPassword(
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

    async search(data: IUserSearch): Promise<IUserSearchCollection> {
        const search: IUserSearchCollection = {};
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
        if (data.country) {
            search.country = new SchemaMongoose.Types.ObjectId(data.country);
        }
        return search;
    }
}
