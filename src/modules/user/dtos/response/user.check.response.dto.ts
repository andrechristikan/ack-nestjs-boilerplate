import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserCheckEmailResponseDto {
    @ApiProperty({
        required: true,
    })
    @Expose()
    badWord: boolean;

    @ApiProperty({
        required: true,
    })
    @Expose()
    exist: boolean;
}

export class UserCheckUsernameResponseDto extends UserCheckEmailResponseDto {
    @ApiProperty({
        required: true,
    })
    @Expose()
    pattern: boolean;
}
