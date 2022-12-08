import { Injectable } from '@nestjs/common';
import {
    registerDecorator,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingUseCase } from 'src/common/setting/use-cases/setting.use-case';

@ValidatorConstraint({ async: true })
@Injectable()
export class MobileNumberAllowedConstraint
    implements ValidatorConstraintInterface
{
    constructor(
        private readonly settingService: SettingService,
        private readonly settingUseCase: SettingUseCase
    ) {}

    async validate(value: string): Promise<boolean> {
        const mobileNumbersSetting: SettingEntity =
            await this.settingService.getMobileNumberCountryCodeAllowed();
        const mobileNumbers: string[] = await this.settingUseCase.getValue<
            string[]
        >(mobileNumbersSetting);
        const check = mobileNumbers.find((val) => value.startsWith(val));

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
