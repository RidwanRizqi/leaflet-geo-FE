import { Component, OnInit } from '@angular/core';
import { RoleMenuService } from '../../services/role-menu.service';
import { MenuNode, RoleMenuDTO } from '../../models/role-menu.model';
import { MENU } from '../../components/layouts/sidebar/menu';
import { MenuItem } from '../../components/layouts/sidebar/menu.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

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

  showAddRoleModal: boolean = false;
  newRoleName: string = '';

  showAddUserModal: boolean = false;
  showPassword: boolean = false;
  newUser = {
    username: '',
    password: '',
    role: '',
    nama: ''
  }

  users: any[] = [];
  selectedUser: string = '';

  constructor(private roleMenuService: RoleMenuService, private http: HttpClient) {}

  ngOnInit(): void {
    this.buildMenuTree();
    this.loadAllData();
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}api/users`).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.users = res.data;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.errorMessage = 'Gagal memuat data user';
        this.loading = false;
      }
    });
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
          if (!this.selectedRole && this.roles.includes(this.selectedRole)) {
            this.selectRole(this.selectedRole);
          }
          this.loading = false;
        
        if (this.selectedRole && this.roles.includes(this.selectedRole)) {
          this.selectRole(this.selectedRole);
        }
        this.loading = false;
      },
      error: () => {
        this.roles = [];
        this.loading = false;
      }
    });
  }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.selectedUser = '';
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

  openAddRoleModal(){
    this.newRoleName = '';
    this.showAddRoleModal = true;
  }

  closeAddRoleModal() {
    this.showAddRoleModal = false;
    this.newRoleName = '';
  }

  saveNewRole(){
    if(!this.newRoleName.trim()) return;

    const roleUpper = this.newRoleName.trim().toUpperCase();

    if(this.roles.includes(roleUpper)){
      this.errorMessage = 'Role sudah ada di daftar!';
      return;
    }

    this.saving = true;
    this.roleMenuService.updateRoleMenu({ roleName: roleUpper, menuIds: [] }).subscribe({
      next: (res) => {
        if(res.success){
          this.roles.push(roleUpper);
          this.closeAddRoleModal();
          this.successMessage = `Role ${roleUpper} ditambahkan ke database! Silakan centang menu aksesnya lalu klik 'Simpan Data'.`;
          this.selectRole(roleUpper);
        }
        this.saving = false;
      },
      error: (err) => {
        this.errorMessage = 'Gagal menyimpan role ke database!';
        this.saving = false;
      }
    });
  }

  deleteRole(role: string, event: Event){
    event.stopPropagation();
    const konfirmasi = confirm(`Apakah anda yakin ingin menghapus role ${role}?`);

    if(konfirmasi){
      this.saving = true;
      this.roleMenuService.deleteRoleMenu(role).subscribe({
        next: (res) => {
          if(res.success){
            this.roles = this.roles.filter(r => r !== role);
            if(this.selectedRole === role){
              this.selectedRole = '';
            }
            this.successMessage = `Role ${role} berhasil dihapus dari database!`
          }
          this.saving = false;
        },
        error: (err) => {
          this.errorMessage = 'Gagal menghapus role dari database!';
          this.saving = false;
        }
      });

      if (this.selectedRole === role) {
        this.selectedRole = '';
      }

      this.successMessage = `Role ${role} berhasil dihapus!`;
    }
  }

  selectUser(user: string){
    this.selectedUser = user;
    this.selectedRole = '';
  }

  openAddUserModal(){
    this.newUser = {username: '', password: '', role: '', nama: ''};
    this.showAddUserModal = true;
  }

  closeAddUserModal(){
    this.showAddUserModal = false;
  }

  saveNewUser(){
   const userBaru = {
    username: this.newUser.username.trim().toLowerCase(),
    password: this.newUser.password,
    role: this.newUser.role,
    nama: this.newUser.nama.trim()
   };

   const isExist = this.users.find(u => u.username === userBaru.username);
   if (isExist){
    this.errorMessage = `Username ${userBaru.username} sudah dipakai`;
    return;
   }

   this.saving = true;
   this.http.post<any>(`${environment.apiUrl}api/users`, userBaru).subscribe({
      next: (res) => {
        if (res.success) {
          this.users.push(res.data);
          this.closeAddUserModal();
          this.successMessage = `User ${userBaru.username} dengan role ${userBaru.role} berhasil didaftarkan!`;
          this.selectUser(userBaru.username);
        }
        this.saving = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || `Gagal mendaftarkan user ${userBaru.username}`;
        this.saving = false;
      }
   });
  }

  deleteUser(username: string, event: Event){
    event.stopPropagation();
    const konfirmasi = confirm(`Apakah anda yakin ingin menghapus user ${username}?`);

    if(konfirmasi){
      this.saving = true;
      this.http.delete<any>(`${environment.apiUrl}api/users/${username}`).subscribe({
        next: (res) => {
          if (res.success) {
            this.users = this.users.filter(u => u.username !== username);
            if(this.selectedUser === username){
              this.selectedUser = '';
            }
            this.successMessage = `User ${username} berhasil dihapus!`;
          }
          this.saving = false;
        },
        error: (err) => {
          this.errorMessage = err.error?.message || `Gagal menghapus user ${username}`;
          this.saving = false;
        }
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

}
