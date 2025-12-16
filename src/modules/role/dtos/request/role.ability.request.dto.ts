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

export class RoleAbilityRequestDto {
    @ApiProperty({
        required: true,
        description: 'Ability subject',
        enum: EnumPolicySubject,
    })
    @IsNotEmpty()
    @IsString()
    @IsEnum(EnumPolicySubject)
    subject: EnumPolicySubject;

    @ApiProperty({
        required: true,
        description: 'Ability action base on subject',
        isArray: true,
        default: [EnumPolicyAction.manage],
        enum: EnumPolicyAction,
    })
    @IsString({ each: true })
    @IsEnum(EnumPolicyAction, { each: true })
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    action: EnumPolicyAction[];
}
