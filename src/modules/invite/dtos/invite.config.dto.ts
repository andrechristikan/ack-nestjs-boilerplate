import { Type } from 'class-transformer';
import {
    IsInt,
    IsNotEmpty,
    IsPositive,
    IsString,
    ValidateNested,
} from 'class-validator';

export class InviteConfigReferenceDto {
    @IsString()
    @IsNotEmpty()
    prefix: string;

    @IsInt()
    @IsPositive()
    length: number;
}

export class InviteConfigDto {
    @IsInt()
    @IsPositive()
    expiredInMinutes: number;

    @IsInt()
    @IsPositive()
    tokenLength: number;

    @IsString()
    @IsNotEmpty()
    linkBaseUrl: string;

    @IsInt()
    @IsPositive()
    resendInMinutes: number;

    @ValidateNested()
    @Type(() => InviteConfigReferenceDto)
    reference: InviteConfigReferenceDto;
}
