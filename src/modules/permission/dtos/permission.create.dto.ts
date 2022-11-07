import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class PermissionCreateDto {
    @ApiProperty({
        description: 'Alias name of permission',
        example: faker.name.jobDescriptor(),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly name: string;

    @ApiProperty({
        description: 'Unique code of permission',
        example: faker.random.alpha(5),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly code: string;

    @ApiProperty({
        description: 'Description of permission',
        example: 'blabla description',
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    readonly description: string;
}
