import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TenantCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'Tenant name',
        example: 'Acme Travel Group',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;
}
