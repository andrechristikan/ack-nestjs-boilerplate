import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

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
        description: 'Role id',
        example: '65f3d2e44b9a7e1bd2c9a8f1',
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    roleId: string;
}
