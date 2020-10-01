import { IsString, MaxLength, MinLength, IsNotEmpty } from 'class-validator';

export class CountryStoreRequest {
    @IsString()
    @IsNotEmpty()
    @MaxLength(6)
    @MinLength(1)
    mobileNumberCode: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(3)
    @MinLength(1)
    countryCode: string;

    @IsString()
    @IsNotEmpty()
    countryName: string;
}
