import { EnumUserLoginFrom } from '@generated/prisma-client';
import { DeviceRequestDto } from '@modules/device/dtos/requests/device.request.dto';
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

    @IsNotEmpty()
    @IsObject()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => DeviceRequestDto)
    device: DeviceRequestDto;
}
