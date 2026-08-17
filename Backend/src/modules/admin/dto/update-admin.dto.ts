import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAdminDto } from './create-admin.dto';

// Email is left out deliberately — it's the lookup key and a unique index;
// changing it belongs in a dedicated flow, not a general-purpose PATCH.
export class UpdateAdminDto extends PartialType(OmitType(CreateAdminDto, ['email'] as const)) {}
