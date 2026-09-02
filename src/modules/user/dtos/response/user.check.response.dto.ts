import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserCheckEmailResponseDto {
    @ApiProperty({
        required: true,
        example: false,
        description: 'Whether the value contains a blocked word',
    })
    @Expose()
    badWord: boolean;

    @ApiProperty({
        required: true,
        example: false,
        description: 'Whether the value already exists',
    })
    @Expose()
    exist: boolean;
}

export class UserCheckUsernameResponseDto extends UserCheckEmailResponseDto {
    @ApiProperty({
        required: true,
        example: true,
        description: 'Whether the username matches the allowed pattern',
    })
    @Expose()
    pattern: boolean;
}
