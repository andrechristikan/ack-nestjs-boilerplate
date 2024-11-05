import { ApiProperty } from '@nestjs/swagger';

export class SettingUserResponseDto {
    @ApiProperty({
        required: true,
        nullable: false,
        example: 'user',
    })
    usernamePrefix: string;
}
