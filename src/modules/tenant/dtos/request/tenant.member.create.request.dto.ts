import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TenantMemberCreateRequestDto {
    @ApiProperty({
        required: true,
        description: 'User id',
    })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({
        required: true,
        description: 'Role name',
        example: 'tenant-user',
    })
    @IsString()
    @IsNotEmpty()
    roleName: string;
}
