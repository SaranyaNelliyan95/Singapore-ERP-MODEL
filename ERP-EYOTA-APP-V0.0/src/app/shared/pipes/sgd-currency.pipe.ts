import { Pipe, PipeTransform } from '@angular/core';
import { formatSgd } from '../../core/utils/singapore.utils';

@Pipe({ name: 'sgd', standalone: true })
export class SgdCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return formatSgd(value);
  }
}
