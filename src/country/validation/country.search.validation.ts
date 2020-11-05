import { IsString } from 'class-validator';

export class CountrySearchValidation {
    @IsString()
    mobileNumberCode: string;

    @IsString()
    countryCode: string;
}
