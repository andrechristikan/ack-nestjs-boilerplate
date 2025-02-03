import { faker } from '@faker-js/faker';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';

export class AuthSocialGooglePayloadDto extends PickType(
    AuthJwtAccessPayloadDto,
    ['email'] as const
) {
    @ApiProperty({
        required: true,
        example: faker.person.fullName(),
    })
    name: string;

    @ApiProperty({
        required: true,
        example: faker.image.url(),
    })
    photo: string;

    @ApiProperty({
        required: true,
        example: true,
    })
    emailVerified: boolean;
}
