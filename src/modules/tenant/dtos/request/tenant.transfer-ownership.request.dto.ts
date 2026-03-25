import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TenantTransferOwnershipRequestDto {
    @ApiProperty({
        required: true,
        description: 'Target tenant member id that will become owner',
    })
    @IsString()
    @IsNotEmpty()
    memberId: string;
}
