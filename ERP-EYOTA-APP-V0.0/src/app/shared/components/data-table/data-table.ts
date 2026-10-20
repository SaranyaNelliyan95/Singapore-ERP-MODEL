import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataTableColumn, EmptyStateConfig } from '../../../core/models/common.model';
import { StatusBadgeComponent } from '../status-badge/status-badge';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
})
export class DataTableComponent<T extends object> implements OnChanges {
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

  searchTerm = '';
  sortKey: (keyof T & string) | null = null;
  sortDir: 'asc' | 'desc' = 'asc';
  page = 1;

  filteredRows: T[] = [];
  pagedRows: T[] = [];
  totalPages = 1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] || changes['columns'] || changes['pageSize']) {
      this.applyView();
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.page = 1;
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
    this.applyView();
  }

  goToPage(page: number): void {
    this.page = Math.min(Math.max(page, 1), this.totalPages);
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
