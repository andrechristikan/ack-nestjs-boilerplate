import { IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class CountryStoreValidation {
    @IsString()
    @IsNotEmpty()
    @MaxLength(6)
    mobileNumberCode: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(3)
    countryCode: string;

    @IsString()
    @IsNotEmpty()
    countryName: string;
}
