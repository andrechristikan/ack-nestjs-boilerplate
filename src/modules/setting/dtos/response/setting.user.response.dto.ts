import { ApiProperty } from '@nestjs/swagger';

export class SettingUserResponseDto {
    @ApiProperty({
        required: true,
        example: 'user',
    })
    usernamePrefix: string;
}
