export interface RoleMenuDTO {
  roleName: string;
  menuIds: number[];
}

export interface RoleMenuUpdateRequest {
  roleName: string;
  menuIds: number[];
}

export interface MenuNode {
  id: number;
  label: string;
  icon?: string;
  link?: string;
  parentId: number;
  children: MenuNode[];
  checked?: boolean;
  indeterminate?: boolean;
}

export interface MenuPermissionResponse {
  menuIds: number[]; // empty array = all menus (for admin)
}
