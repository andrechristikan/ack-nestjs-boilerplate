import { IsString } from 'class-validator';

export class CountrySearchRequest {
    @IsString()
    mobileNumberCode: string;

    @IsString()
    countryCode: string;
}
