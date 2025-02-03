import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class VerificationResponse {
    @ApiProperty({
        required: true,
        description: 'timestamp in minutes',
    })
    expiredIn: number;

    @ApiProperty({
        required: true,
    })
    @Type(() => String)
    to: string;
}
