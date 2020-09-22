import { IsString, Length } from 'class-validator';

export class CountryStore {
    @IsString()
    @Length(1, 3)
    mobileNumberCode: string;

    @IsString()
    @Length(1, 3)
    countryCode: number;

    @IsString()
    countryName: string;
}
