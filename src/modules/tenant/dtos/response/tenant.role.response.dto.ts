import { ApiProperty } from '@nestjs/swagger';

export class TenantRoleResponseDto {
    @ApiProperty({
        required: true,
        description: 'Role id',
    })
    id: string;

    @ApiProperty({
        required: true,
        description: 'Role name',
    })
    name: string;
}
