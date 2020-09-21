import { IsString } from 'class-validator';

export class CountrySearch {
    @IsString()
    mobileNumberCode: string;

    @IsString()
    countryCode: string;
}
