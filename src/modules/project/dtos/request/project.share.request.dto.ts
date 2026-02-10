import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ProjectShareRequestDto {
    @ApiProperty({
        required: true,
        description: 'User id to share with',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;
}
