import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SettingRequestDto {
    @ApiProperty({
        name: 'setting',
        description: 'setting id',
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsUUID('4')
    @Type(() => String)
    setting: string;
}
