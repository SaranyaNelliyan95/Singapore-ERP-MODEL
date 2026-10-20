import { Pipe, PipeTransform } from '@angular/core';
import { maskNricOrFin } from '../../core/utils/singapore.utils';

@Pipe({ name: 'maskNric', standalone: true })
export class MaskNricPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return maskNricOrFin(value);
  }
}
