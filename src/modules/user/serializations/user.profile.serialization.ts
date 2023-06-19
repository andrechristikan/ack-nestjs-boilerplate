import { ApiHideProperty, OmitType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { UserGetSerialization } from './user.get.serialization';

export class UserProfileSerialization extends OmitType(UserGetSerialization, [
    'isActive',
    'blocked',
    'passwordExpired',
    'passwordCreated',
    'passwordAttempt',
    'inactiveDate',
    'inactivePermanent',
    'blockedDate',
] as const) {
    @ApiHideProperty()
    @Exclude()
    readonly isActive: boolean;

    @ApiHideProperty()
    @Exclude()
    readonly inactivePermanent: boolean;

    @ApiHideProperty()
    @Exclude()
    readonly blocked: boolean;

    @ApiHideProperty()
    @Exclude()
    readonly passwordExpired: Date;

    @ApiHideProperty()
    @Exclude()
    readonly passwordCreated: Date;

    @ApiHideProperty()
    @Exclude()
    readonly passwordAttempt: number;

    @ApiHideProperty()
    @Exclude()
    readonly inactiveDate?: Date;

    @ApiHideProperty()
    @Exclude()
    readonly blockedDate?: Date;
}
