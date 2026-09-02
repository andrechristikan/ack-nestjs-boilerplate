import { DatabaseResponseDto } from '@common/database/dtos/response/database.response.dto';
import { faker } from '@faker-js/faker';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UserTwoFactorDto extends DatabaseResponseDto {
    @ApiProperty({
        required: true,
        example: faker.database.mongodbObjectId(),
        description: 'Identifier of the user who owns this two-factor record',
    })
    @Expose()
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
    @Expose()
    enabled: boolean;

    @ApiProperty({
        required: true,
        description: 'Whether the user is required to set up 2FA',
        example: false,
    })
    @Expose()
    requiredSetup: boolean;

    @ApiProperty({
        required: false,
        example: faker.date.past(),
        description: 'When two-factor authentication was confirmed',
    })
    @Expose()
    confirmedAt?: Date;

    @ApiHideProperty()
    @Exclude()
    lastUsedAt?: Date;
}
