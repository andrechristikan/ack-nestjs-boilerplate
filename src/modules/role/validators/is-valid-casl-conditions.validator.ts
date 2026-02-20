import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';
import { EnumPolicyPlaceholder } from '@modules/policy/enums/policy.enum';

const allowedPlaceholders = new Set<string>(
    Object.values(EnumPolicyPlaceholder)
);

function validateConditionShape(
    obj: Record<string, unknown>,
    path: string
): string[] {
    const errors: string[] = [];

    for (const key of Object.keys(obj)) {
        if (key.startsWith('$')) {
            errors.push(
                `Mongo-style operator "${key}" is not supported at path "${path}". Use Prisma filter syntax (e.g. equals, in, AND, OR, NOT).`
            );
            continue;
        }

        const value = obj[key];
        if (
            typeof value === 'string' &&
            value.startsWith('$') &&
            !allowedPlaceholders.has(value)
        ) {
            errors.push(
                `Unknown placeholder "${value}" at path "${path}.${key}". Allowed placeholders: ${Array.from(
                    allowedPlaceholders
                ).join(', ')}.`
            );
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            errors.push(
                ...validateConditionShape(
                    value as Record<string, unknown>,
                    `${path}.${key}`
                )
            );
        }

        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                if (
                    typeof item === 'string' &&
                    item.startsWith('$') &&
                    !allowedPlaceholders.has(item)
                ) {
                    errors.push(
                        `Unknown placeholder "${item}" at path "${path}.${key}[${i}]". Allowed placeholders: ${Array.from(
                            allowedPlaceholders
                        ).join(', ')}.`
                    );
                }

                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    errors.push(
                        ...validateConditionShape(
                            item as Record<string, unknown>,
                            `${path}.${key}[${i}]`
                        )
                    );
                }
            }
        }
    }

    return errors;
}

@ValidatorConstraint({ name: 'isValidCaslConditions', async: false })
export class IsValidCaslConditionsConstraint
    implements ValidatorConstraintInterface
{
    private lastErrors: string[] = [];

    validate(value: unknown): boolean {
        if (value === undefined || value === null) {
            return true;
        }

        if (typeof value !== 'object' || Array.isArray(value)) {
            this.lastErrors = ['Conditions must be a plain object'];
            return false;
        }

        this.lastErrors = validateConditionShape(
            value as Record<string, unknown>,
            'conditions'
        );
        return this.lastErrors.length === 0;
    }

    defaultMessage(): string {
        return this.lastErrors.length > 0
            ? this.lastErrors.join('; ')
            : 'Invalid CASL conditions';
    }
}

export function IsValidCaslConditions(
    validationOptions?: ValidationOptions
): PropertyDecorator {
    return function (object: object, propertyName: string | symbol) {
        registerDecorator({
            target: object.constructor,
            propertyName: String(propertyName),
            options: validationOptions,
            constraints: [],
            validator: IsValidCaslConditionsConstraint,
        });
    };
}
