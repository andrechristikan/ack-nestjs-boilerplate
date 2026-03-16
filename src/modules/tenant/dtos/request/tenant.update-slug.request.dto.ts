import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TenantUpdateSlugRequestDto {
    @ApiProperty({
        required: true,
        description: 'Tenant slug',
        example: 'acme-travel-group',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    slug: string;
}
