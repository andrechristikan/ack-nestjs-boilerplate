import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingService } from 'src/common/setting/services/setting.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class MobileNumberAllowedConstraint
    implements ValidatorConstraintInterface
{
    constructor(private readonly settingService: SettingService) {}

    async validate(value: string): Promise<boolean> {
        const settingMobileNumber: SettingEntity =
            await this.settingService.findOneByName(
                'mobileNumberCountryCodeAllowed'
            );

        const valueMobileNumber: string[] = await this.settingService.getValue<
            string[]
        >(settingMobileNumber);

        const check = valueMobileNumber.find((val) => value.startsWith(val));

        return check ? true : false;
    }
}

export function MobileNumberAllowed(validationOptions?: ValidationOptions) {
    return function (object: Record<string, any>, propertyName: string): void {
        registerDecorator({
            name: 'MobileNumberAllowed',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: MobileNumberAllowedConstraint,
        });
    };
}
