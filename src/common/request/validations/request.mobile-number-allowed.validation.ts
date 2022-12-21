import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { SettingService } from 'src/common/setting/services/setting.service';

@ValidatorConstraint({ async: true })
@Injectable()
export class MobileNumberAllowedConstraint
    implements ValidatorConstraintInterface
{
    constructor(private readonly settingService: SettingService) {}

    async validate(value: string): Promise<boolean> {
        const mobileNumbersSetting: string[] =
            await this.settingService.getMobileNumberCountryCodeAllowed();
        mobileNumbersSetting;
        const check = mobileNumbersSetting.find((val) => value.startsWith(val));

        return !!check;
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
