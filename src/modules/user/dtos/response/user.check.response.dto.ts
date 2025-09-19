import { ApiProperty } from '@nestjs/swagger';

export class UserCheckEmailResponseDto {
    @ApiProperty({
        required: true,
    })
    badWord: boolean;

    @ApiProperty({
        required: true,
    })
    exist: boolean;
}

export class UserCheckUsernameResponseDto extends UserCheckEmailResponseDto {
    @ApiProperty({
        required: true,
    })
    pattern: boolean;
}
