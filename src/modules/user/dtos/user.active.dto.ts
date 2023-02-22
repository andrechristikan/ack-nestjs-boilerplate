import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsNotEmpty } from 'class-validator';

export class UserActiveDto {
    @ApiProperty({
        name: 'isActive',
        required: true,
        nullable: false,
    })
    @IsBoolean()
    @IsNotEmpty()
    isActive: boolean;

    @ApiProperty({
        name: 'inactiveDate',
        description: 'inactive date of user',
        required: true,
        nullable: false,
    })
    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    inactiveDate: Date;
}
