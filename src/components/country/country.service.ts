import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Country } from 'components/country/country.model';
import { CountryStore, CountrySearch } from 'components/country/country.interface';

@Injectable()
export class CountryService {
    constructor(
        @InjectModel('country') private countryModel: Model<Country>) {}

    async getAll(
        skip: number,
        limit: number,
        search: CountrySearch,
    ): Promise<Country[]> {
        return this.countryModel
            .find(search)
            .skip(skip)
            .limit(limit)
            .exec();
    }

    async getOneById(id: string): Promise<Country> {
        return this.countryModel.findById(id).exec();
    }

    async getOneByCountryCode(countryCode: string): Promise<Country> {
        return this.countryModel
            .findOne({
                countryCode: countryCode,
            })
            .exec();
    }

    async getOneByMobileNumberCode(mobileNumberCode: string): Promise<Country> {
        return this.countryModel
            .findOne({
                mobileNumberCode: mobileNumberCode,
            })
            .exec();
    }

    async store(data: CountryStore): Promise<Country> {
        const country: Country = new this.countryModel(data);
        return country.save();
    }

    async destroy(id: string): Promise<Country> {
        return this.countryModel.findByIdAndDelete(id).exec();
    }

    async search(data: CountrySearch): Promise<CountrySearch> {
        const search: CountrySearch = {};
        if (data.mobileNumberCode) {
            search.mobileNumberCode = data.mobileNumberCode;
        }
        if (data.countryCode) {
            search.countryCode = data.countryCode;
        }

        return search;
    }
}
