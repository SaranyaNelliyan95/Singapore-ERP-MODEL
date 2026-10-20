import { Pipe, PipeTransform } from '@angular/core';
import { formatSgDate } from '../../core/utils/singapore.utils';

@Pipe({ name: 'sgDate', standalone: true })
export class SgDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatSgDate(value);
  }
}
