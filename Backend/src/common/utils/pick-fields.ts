/**
 * DTO → document fields, copying only those actually sent. `nullable` fields
 * accept an explicit null to clear them; for `required` ones a null is dropped
 * rather than handed to Mongoose, whose required-validator would turn it into
 * a 500.
 */
export function pickFields(
  dto: object,
  nullable: string[],
  required: string[],
): Record<string, unknown> {
  const src = dto as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of nullable) if (src[key] !== undefined) out[key] = src[key];
  for (const key of required) if (src[key] != null) out[key] = src[key];
  return out;
}
