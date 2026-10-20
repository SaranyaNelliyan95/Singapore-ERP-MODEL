import { Pipe, PipeTransform } from '@angular/core';
import { formatSgPhone } from '../../core/utils/singapore.utils';

@Pipe({ name: 'phoneSg', standalone: true })
export class PhoneSgPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatSgPhone(value);
  }
}
