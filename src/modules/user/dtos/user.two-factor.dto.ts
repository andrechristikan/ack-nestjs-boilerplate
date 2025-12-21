import { DatabaseDto } from '@common/database/dtos/database.dto';
import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class UserTwoFactorDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
    })
    userId: string;

    @ApiHideProperty()
    @Exclude()
    secret?: string;

    @ApiHideProperty()
    @Exclude()
    iv?: string;

    @ApiHideProperty()
    @Exclude()
    backupCodes?: string[];

    @ApiProperty({
        required: true,
        description: 'Whether the user has 2FA enabled',
        example: false,
    })
    enabled: boolean;

    @ApiProperty({
        required: true,
        description: 'Whether the user is required to set up 2FA',
        example: false,
    })
    requiredSetup: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
    })
    confirmedAt?: Date;

    @ApiHideProperty()
    @Exclude()
    lastUsedAt?: Date;
}
