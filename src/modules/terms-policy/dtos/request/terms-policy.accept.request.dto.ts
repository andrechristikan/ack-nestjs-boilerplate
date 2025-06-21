import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TermsPolicyAcceptRequestDto {
    @ApiProperty({
        required: true,
        description: 'Policy Id to accept',
    })
    @IsUUID()
    policy: string;
}
