import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty } from 'class-validator';

export class UserBlockedDto {
    @ApiProperty({
        name: 'blocked',
        required: true,
        nullable: false,
    })
    @IsBoolean()
    @IsNotEmpty()
    blocked: boolean;

    @ApiProperty({
        name: 'blockedDate',
        required: true,
        nullable: false,
    })
    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    blockedDate: Date;
}
