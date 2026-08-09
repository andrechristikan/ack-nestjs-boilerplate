import { faker } from '@faker-js/faker';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceInviteClaimRequestDto {
    @ApiProperty({
        description: 'Plain workspace invite token received in the invite email link',
        example: faker.string.alphanumeric(100),
        required: true,
    })
    @IsString()
    @IsNotEmpty()
    inviteToken: string;
}
