import { DeviceDto } from '@modules/device/dtos/device.dto';
import { EnumUserLoginFrom } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsString,
    MinLength,
    ValidateNested,
} from 'class-validator';

export class TenantLoginRequestDto {
    @IsEmail()
    @IsNotEmpty()
    email: Lowercase<string>;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;

    @IsNotEmpty()
    @IsEnum(EnumUserLoginFrom)
    from: EnumUserLoginFrom;

    @Type(() => DeviceDto)
    @IsNotEmpty()
    @IsObject()
    @IsNotEmptyObject()
    @ValidateNested()
    device: DeviceDto;
}
