import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Country } from 'country/country.model';

@Injectable()
export class CountryService {
    constructor(
        @InjectModel('countries') private countryModel: Model<Country>
    ) {}

    async getAll(skip: number, limit: number): Promise<Country[]> {
        return this.userModel
            .find({})
            .select('-password')
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async getOneById(id: string, full?: boolean): Promise<Country> {
        const user = this.userModel.findById(id);
        if (!full) {
            user.select('-password');
        }
        return user.exec();
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

    async store(data: UserStoreFillableFields): Promise<User> {
        data.password = await this.authService.hashPassword(data.password);
        data.email = data.email.toLowerCase();
        data.firstName = data.firstName.toLowerCase();
        data.lastName = data.lastName.toLowerCase();

        const user = new this.userModel(data);
        return user.save();
    }

    async destroy(id: string): Promise<User> {
        return this.userModel.findByIdAndDelete(id).exec();
    }

    async update(id: string, data: UserUpdateFillableFields): Promise<User> {
        const user: User = await this.getOneById(id);
        user.firstName = data.firstName.toLowerCase();
        user.lastName = data.lastName.toLowerCase();
        return user.save();
    }
}
