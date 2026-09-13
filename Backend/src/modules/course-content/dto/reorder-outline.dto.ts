import { Type } from 'class-transformer';
import { IsArray, IsMongoId, ValidateNested } from 'class-validator';

export class ReorderModuleDto {
  @IsMongoId()
  id!: string;

  @IsArray()
  @IsMongoId({ each: true })
  itemIds!: string[];
}

/**
 * The whole outline as the builder now has it — every module, and every item
 * in the module it now sits under. A partial payload is not accepted: the
 * service checks that this names exactly the rows the course holds today, so
 * a stale tab cannot strand a row someone else just added at whatever
 * sortOrder it happened to have.
 */
export class ReorderOutlineDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderModuleDto)
  modules!: ReorderModuleDto[];
}
