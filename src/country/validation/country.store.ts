import { IsString, MaxLength, MinLength, IsNotEmpty } from 'class-validator';

export class CountryStoreRequest {
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
