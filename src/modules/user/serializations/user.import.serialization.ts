import { ApiProperty } from '@nestjs/swagger';

export class UserImportSerialization {
    @ApiProperty({
        description: 'Data extract from excel',
        example: [{}],
        type: 'array',
    })
    extract: Record<string, any>[];

    @ApiProperty({
        description: 'Data after validation with dto',
        example: [{}],
        type: 'array',
    })
    dto: Record<string, any>[];
}
