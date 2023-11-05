import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EmailSendSignUpDto {
    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ required: true })
    @IsString()
    @IsNotEmpty()
    appName: string;
}
