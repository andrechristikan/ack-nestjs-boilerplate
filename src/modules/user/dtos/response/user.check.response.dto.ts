import { ApiProperty } from '@nestjs/swagger';

export class UserCheckResponseDto {
    @ApiProperty({
        required: true,
    })
    passed: boolean;
}
