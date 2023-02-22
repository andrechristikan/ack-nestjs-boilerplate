import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class UserPasswordDto {
    @ApiProperty({
        name: 'password',
        description: 'password hash of string password',
        required: true,
        nullable: false,
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        name: 'passwordExpired',
        description: 'password expired date',
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    passwordExpired: Date;

    @ApiProperty({
        name: 'passwordCreated',
        description: 'password created date',
        required: true,
        nullable: false,
    })
    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    passwordCreated: Date;

    @ApiProperty({
        name: 'salt',
        required: true,
        nullable: false,
    })
    @IsString()
    @IsNotEmpty()
    salt: string;
}
