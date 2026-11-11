import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableCellAction, DataTableColumn, EmptyStateConfig } from '../../../core/models/common.model';
import { StatusBadgeComponent } from '../status-badge/status-badge';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
})
export class DataTableComponent<T extends object> implements OnChanges {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input({ required: true }) columns: DataTableColumn<T>[] = [];
  @Input({ required: true }) rows: T[] = [];
  @Input() searchPlaceholder = 'Search across columns…';
  @Input() pageSize = 5;
  @Input() emptyState: EmptyStateConfig = {
    title: 'No records found',
    description: 'Try adjusting your search or filters.',
  };
  @Input() trackByKey: keyof T & string = 'id' as keyof T & string;

  @Output() readonly emptyAction = new EventEmitter<void>();
  @Output() readonly cellAction = new EventEmitter<{ actionId: string; row: T }>();

  searchTerm = '';
  sortKey: (keyof T & string) | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;
  /** Row key for the currently open actions menu (click-to-open, not hover). */
  openMenuKey: string | null = null;

  filteredRows: T[] = [];
  pagedRows: T[] = [];
  totalPages = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] || changes['columns'] || changes['pageSize']) {
      this.openMenuKey = null;
      this.applyView();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.openMenuKey) {
      return;
    }
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) {
      // Keep open when clicking inside the same menu; closed only by outside / toggle / select
      const menu = (target as HTMLElement).closest?.('.action-menu');
      if (menu) {
        return;
      }
    }
    this.openMenuKey = null;
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.page = 1;
    this.openMenuKey = null;
    this.applyView();
  }

  toggleSort(column: DataTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }

    if (this.sortKey === column.key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = column.key;
      this.sortDir = 'asc';
    }
    this.openMenuKey = null;
    this.applyView();
  }

  goToPage(page: number): void {
    this.page = Math.min(Math.max(page, 1), this.totalPages);
    this.openMenuKey = null;
    this.applyView(false);
  }

  cellValue(row: T, column: DataTableColumn<T>): string {
    if (column.format) {
      return column.format(row);
    }
    const value = row[column.key];
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }

  trackRow(_index: number, row: T): string {
    const key = row[this.trackByKey];
    return key === undefined || key === null ? JSON.stringify(row) : String(key);
  }

  toggleMenu(row: T, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const key = this.trackRow(0, row);
    this.openMenuKey = this.openMenuKey === key ? null : key;
  }

  isMenuOpen(row: T): boolean {
    return this.openMenuKey === this.trackRow(0, row);
  }

  onMenuAction(action: DataTableCellAction<T>, row: T, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (action.disabled) {
      return;
    }
    this.openMenuKey = null;
    this.cellAction.emit({ actionId: action.id, row });
  }

  private applyView(refilter = true): void {
    if (refilter) {
      const term = this.searchTerm.trim().toLowerCase();
      this.filteredRows = !term
        ? [...this.rows]
        : this.rows.filter((row) =>
            this.columns.some((column) =>
              this.cellValue(row, column).toLowerCase().includes(term),
            ),
          );

      if (this.sortKey) {
        const key = this.sortKey;
        const dir = this.sortDir === 'asc' ? 1 : -1;
        this.filteredRows.sort((a, b) => {
          const av = String(a[key] ?? '').toLowerCase();
          const bv = String(b[key] ?? '').toLowerCase();
          return av.localeCompare(bv, undefined, { numeric: true }) * dir;
        });
      }
    }

    this.totalPages = Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }
    const start = (this.page - 1) * this.pageSize;
    this.pagedRows = this.filteredRows.slice(start, start + this.pageSize);
  }
}
