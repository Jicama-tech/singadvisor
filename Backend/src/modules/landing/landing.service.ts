import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LandingSection,
  LandingSectionDocument,
  LandingSectionKey,
  LandingVariant,
} from './entities/landing-section.entity';

@Injectable()
export class LandingService {
  constructor(
    @InjectModel(LandingSection.name)
    private readonly model: Model<LandingSectionDocument>,
  ) {}

  /** Public homepage feed: visible sections only, in display order. */
  findAllPublic() {
    return this.model
      .find({ visible: true })
      .sort({ sortOrder: 1 })
      .select('key sortOrder variant content -_id')
      .exec();
  }

  /** Admin list view: everything, including hidden sections. */
  findAllForAdmin() {
    return this.model.find().sort({ sortOrder: 1 }).exec();
  }

  async findOneForAdmin(key: LandingSectionKey) {
    const doc = await this.model.findOne({ key }).exec();
    if (!doc) throw new NotFoundException(`No landing section with key "${key}"`);
    return doc;
  }

  async updateContent(key: LandingSectionKey, content: object) {
    const doc = await this.model
      .findOneAndUpdate({ key }, { content }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`No landing section with key "${key}"`);
    return doc;
  }

  async setVisibility(key: LandingSectionKey, visible: boolean) {
    const doc = await this.model
      .findOneAndUpdate({ key }, { visible }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`No landing section with key "${key}"`);
    return doc;
  }

  async setVariant(key: LandingSectionKey, variant: LandingVariant) {
    const doc = await this.model
      .findOneAndUpdate({ key }, { variant }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`No landing section with key "${key}"`);
    return doc;
  }

  /**
   * Swaps this section's sortOrder with its immediate neighbour in the
   * requested direction — the "up/down arrow" reorder model, simpler and
   * more predictable than free drag-and-drop for a fixed 9-row list.
   */
  async move(key: LandingSectionKey, direction: 'up' | 'down') {
    const all = await this.model.find().sort({ sortOrder: 1 }).exec();
    const index = all.findIndex((s) => s.key === key);
    if (index === -1) throw new NotFoundException(`No landing section with key "${key}"`);

    const neighbourIndex = direction === 'up' ? index - 1 : index + 1;
    if (neighbourIndex < 0 || neighbourIndex >= all.length) {
      // Already at the top/bottom — a no-op, not an error.
      return all;
    }

    const current = all[index];
    const neighbour = all[neighbourIndex];
    const currentOrder = current.sortOrder;
    const neighbourOrder = neighbour.sortOrder;

    await Promise.all([
      this.model.updateOne({ _id: current._id }, { sortOrder: neighbourOrder }).exec(),
      this.model.updateOne({ _id: neighbour._id }, { sortOrder: currentOrder }).exec(),
    ]);

    return this.findAllForAdmin();
  }
}
