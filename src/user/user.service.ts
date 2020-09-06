import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
    User,
    UserFillableFields,
    UserFields,
    UserFullFields,
} from 'user/user.model';
import { AuthService } from 'auth/auth.service';

@Injectable()
export class UserService {
    constructor(
        @InjectModel('users') private userModel: Model<User>,
        private readonly authService: AuthService,
    ) {}

    async getById(id: string): Promise<User> {
        return this.userModel.findById(id).exec();
    }

    async getByEmail(email: string): Promise<User> {
        return this.userModel
            .findOne({
                email: email.toLowerCase(),
            })
            .exec();
    }

    async getByMobileNumber(mobileNumber: string): Promise<User> {
        return this.userModel
            .findOne({
                mobileNumber: mobileNumber,
            })
            .exec();
    }

    async store(data: UserFillableFields): Promise<User> {
        data.password = await this.authService.hashPassword(data.password);
        data.email = data.email.toLowerCase();
        data.firstName = data.firstName.toLowerCase();
        data.lastName = data.lastName.toLowerCase();

        const user = new this.userModel(data);
        return user.save();
    }

    async filterUserField(data: UserFullFields): Promise<UserFields> {
        return {
            id: data.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            mobileNumber: data.mobileNumber,
        };
    }

    async destroy(id: string): Promise<User> {
        return this.userModel.findByIdAndDelete(id).exec();
    }
}
