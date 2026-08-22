import { registerDecorator, ValidationOptions } from 'class-validator';

// Word count, not character count — matches how the admin editor counts
// down as they type.
function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function MaxWords(max: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxWords',
      target: object.constructor,
      propertyName,
      constraints: [max],
      options: validationOptions,
      validator: {
        validate(value: unknown, args) {
          if (typeof value !== 'string' || !args) return false;
          const [limit] = args.constraints;
          return countWords(value) <= limit;
        },
        defaultMessage(args) {
          const [limit] = args?.constraints ?? [max];
          return `$property must be ${limit} words or fewer`;
        },
      },
    });
  };
}
