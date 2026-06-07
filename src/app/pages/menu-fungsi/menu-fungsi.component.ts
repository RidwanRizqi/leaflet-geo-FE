import { Component, OnInit } from '@angular/core';
import { RoleMenuService } from '../../services/role-menu.service';
import { MenuNode, RoleMenuDTO } from '../../models/role-menu.model';
import { MENU } from '../../components/layouts/sidebar/menu';
import { MenuItem } from '../../components/layouts/sidebar/menu.model';

@Component({
  selector: 'app-menu-fungsi',
  templateUrl: './menu-fungsi.component.html',
  styleUrls: ['./menu-fungsi.component.scss']
})
export class MenuFungsiComponent implements OnInit {
  roles: string[] = [];
  selectedRole: string = '';
  existingMappings: RoleMenuDTO[] = [];

  allMenuNodes: MenuNode[] = [];
  orderedMenuNodes: MenuNode[] = [];
  selectedMenuIds: Set<number> = new Set();

  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(private roleMenuService: RoleMenuService) {}

  ngOnInit(): void {
    this.buildMenuTree();
    this.loadAllData();
  }

  buildMenuTree(): void {
    const flatList: MenuNode[] = [];
    this.flattenMenu(MENU, 0, flatList);
    this.allMenuNodes = flatList;
    this.orderedMenuNodes = this.getOrderedNodes();
  }

  private flattenMenu(items: MenuItem[], parentId: number, result: MenuNode[]): void {
    for (const item of items) {
      const node: MenuNode = {
        id: item.id || 0,
        label: typeof item.label === 'string' ? item.label : (item.label || ''),
        icon: item.icon || '',
        link: item.link || '',
        parentId: parentId,
        children: [],
        checked: false,
        indeterminate: false
      };
      result.push(node);
      if (item.subItems && item.subItems.length > 0) {
        this.flattenMenu(item.subItems, node.id, result);
      }
    }
  }

  private getOrderedNodes(): MenuNode[] {
    const result: MenuNode[] = [];
    const addChildren = (parentId: number) => {
      for (const node of this.allMenuNodes) {
        if (node.parentId === parentId) {
          result.push(node);
          addChildren(node.id);
        }
      }
    };
    addChildren(0);
    return result;
  }

  loadAllData(): void {
    this.loading = true;
    this.roleMenuService.getAllRoleMenus().subscribe({
      next: (mappings) => {
        this.existingMappings = mappings;
        this.roles = mappings.map(m => m.roleName);
        for (const role of ['ADMIN', 'OPERATOR', 'VIEWER']) {
          if (!this.roles.includes(role)) {
            this.roles.push(role);
          }
        }
        if (this.selectedRole && this.roles.includes(this.selectedRole)) {
          this.selectRole(this.selectedRole);
        }
        this.loading = false;
      },
      error: () => {
        this.roles = ['ADMIN', 'OPERATOR', 'VIEWER'];
        this.loading = false;
      }
    });
  }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.errorMessage = '';
    this.successMessage = '';

    const mapping = this.existingMappings.find(m => m.roleName === role);
    const menuIds = mapping ? mapping.menuIds : [];
    this.selectedMenuIds = new Set(menuIds);
    this.updateCheckboxStates();
  }

  toggleMenu(menuId: number): void {
    if (this.selectedMenuIds.has(menuId)) {
      this.selectedMenuIds.delete(menuId);
    } else {
      this.selectedMenuIds.add(menuId);
    }
    this.toggleChildren(menuId, this.selectedMenuIds.has(menuId));
    this.updateCheckboxStates();
  }

  private toggleChildren(parentId: number, checked: boolean): void {
    for (const node of this.allMenuNodes) {
      if (node.parentId === parentId) {
        if (checked) {
          this.selectedMenuIds.add(node.id);
        } else {
          this.selectedMenuIds.delete(node.id);
        }
        this.toggleChildren(node.id, checked);
      }
    }
  }

  private updateCheckboxStates(): void {
    for (const node of this.allMenuNodes) {
      node.checked = this.selectedMenuIds.has(node.id);
      node.indeterminate = false;

      const children = this.allMenuNodes.filter(n => n.parentId === node.id);
      if (children.length > 0) {
        const checkedChildren = children.filter(c => this.selectedMenuIds.has(c.id));
        if (checkedChildren.length > 0 && checkedChildren.length < children.length) {
          node.indeterminate = true;
        }
      }
    }
  }

  selectAll(): void {
    this.selectedMenuIds = new Set(this.allMenuNodes.map(n => n.id));
    this.updateCheckboxStates();
  }

  deselectAll(): void {
    this.selectedMenuIds = new Set();
    this.updateCheckboxStates();
  }

  saveMapping(): void {
    if (!this.selectedRole || this.saving) return;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.roleMenuService.updateRoleMenu({
      roleName: this.selectedRole,
      menuIds: Array.from(this.selectedMenuIds)
    }).subscribe({
      next: () => {
        this.successMessage = 'Mapping berhasil disimpan untuk role ' + this.selectedRole;
        this.saving = false;
        this.loadAllData();
      },
      error: (err) => {
        this.errorMessage = 'Gagal menyimpan: ' + (err.error?.message || err.message);
        this.saving = false;
      }
    });
  }

  getMenuCountText(role: string): string {
    const mapping = this.existingMappings.find(m => m.roleName === role);
    const count = mapping ? mapping.menuIds.length : 0;
    return count > 0 ? count + ' menu terdaftar' : 'Belum dikonfigurasi';
  }

  getLabel(label: any): string {
    if (typeof label === 'string') return label;
    return label || '';
  }

  getIndentLevel(node: MenuNode): number {
    let level = 0;
    let currentId = node.parentId;
    while (currentId !== 0) {
      level++;
      const parent = this.allMenuNodes.find(n => n.id === currentId);
      if (!parent) break;
      currentId = parent.parentId;
    }
    return level;
  }

  hasChildren(node: MenuNode): boolean {
    return this.allMenuNodes.some(n => n.parentId === node.id);
  }

  getIcon(icon: string | undefined): string {
    return icon || 'ri-menu-line';
  }
}
