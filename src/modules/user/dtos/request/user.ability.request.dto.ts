import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayNotEmpty,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
} from 'class-validator';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

export class UserAbilityRequestDto {
    @ApiProperty({
        required: true,
        description: 'Ability subject',
        enum: EnumPolicySubject,
        example: EnumPolicySubject.user,
    })
    @IsNotEmpty()
    @IsString()
    @IsEnum(EnumPolicySubject)
    subject: EnumPolicySubject;

    @ApiProperty({
        required: true,
        description: 'Ability actions',
        isArray: true,
        enum: EnumPolicyAction,
        example: [EnumPolicyAction.read, EnumPolicyAction.update],
    })
    @IsString({ each: true })
    @IsEnum(EnumPolicyAction, { each: true })
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    action: EnumPolicyAction[];
}
