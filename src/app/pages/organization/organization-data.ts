// API Response Interface
export interface ApiOrganizationNode {
  id: string;
  parentId: string | null;
  employee_code: string;
  supervisor_code: string | null;
  original_supervisor_code: string | null;
  division_id: number | null;
  department_id: number | null;
  line: string | null;
  section: {
    id: number;
    name: string;
    parent_id: number | null;
  } | null;
  group: any;
  sub_section: any;
  is_shift: number;
  is_intern: number;
  is_active: number;
  is_vacant: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// Transformed interface for the org chart
export interface OrganizationNode {
  id: string;
  parentId?: string;
  name: string;
  position: string;
  email: string;
  employeeId: string;
  level: string;
  avatar: string;
  department: string;
}

// Dummy avatar mapping for employees
const DUMMY_AVATARS = [
  'assets/images/users/avatar-1.jpg',
  'assets/images/users/avatar-2.jpg',
  'assets/images/users/avatar-3.jpg',
  'assets/images/users/avatar-4.jpg',
  'assets/images/users/avatar-5.jpg',
  'assets/images/users/avatar-6.jpg',
  'assets/images/users/avatar-7.jpg',
  'assets/images/users/avatar-8.jpg',
  'assets/images/users/avatar-9.jpg',
  'assets/images/users/avatar-10.jpg'
];

// Transform API data to org chart format
export function transformApiData(apiData: ApiOrganizationNode[]): OrganizationNode[] {
  // First, create a map of valid IDs
  const validIds = new Set(apiData.map(item => item.id));

  // Transform data and validate parentId references
  const transformedData = apiData.map((item, index) => {
    // Check if parentId exists in the data, if not, set to undefined
    const validParentId = item.parentId && validIds.has(item.parentId) ? item.parentId : undefined;

    return {
      id: item.id,
      parentId: validParentId,
      name: item.section?.name || `Employee ${item.employee_code}`,
      position: item.section?.name || 'Position',
      email: `${item.employee_code}@company.com`,
      employeeId: item.employee_code,
      level: item.department_id ? `D${item.department_id}` : 'M1',
      avatar: DUMMY_AVATARS[index % DUMMY_AVATARS.length],
      department: item.section?.name || 'Department'
    };
  });

  // Filter out any items that would create orphaned nodes (optional)
  // Or keep them as root nodes if that's the desired behavior
  return transformedData;
}

// Clean data to ensure only valid nodes with proper parent references
export function cleanOrganizationData(data: any[]): any[] {
  console.log('Input data for cleaning:', data);
  console.log('Input data length:', data.length);

  const validIds = new Set(data.map(item => item.id));
  console.log('Valid IDs found:', Array.from(validIds));

  // Filter out nodes with invalid parent references
  const cleanedData = data.filter(item => {
    if (!item.parentId) {
      console.log(`Node ${item.id} is root node (no parentId)`);
      return true; // Root nodes are always valid
    }

    const isValidParent = validIds.has(item.parentId);
    if (!isValidParent) {
      console.log(`Node ${item.id} has invalid parentId: ${item.parentId}`);
    }
    return isValidParent;
  });

  console.log(`Data cleaning: ${data.length} -> ${cleanedData.length} valid nodes`);

  // Log any removed nodes for debugging
  const removedNodes = data.filter(item => {
    if (!item.parentId) return false;
    return !validIds.has(item.parentId);
  });

  if (removedNodes.length > 0) {
    console.warn('Removed nodes with invalid parent references:', removedNodes.map(n => ({ id: n.id, parentId: n.parentId })));
  }

  return cleanedData;
}

// Keep the old dummy data for fallback
export const ORGANIZATION_DATA: OrganizationNode[] = [
  {
    id: '1',
    name: 'Gabriel Palmer',
    position: 'CEO',
    email: 'gabriel.palmer@company.com',
    employeeId: '4091',
    level: 'M4',
    avatar: 'assets/images/users/avatar-8.jpg',
    department: 'Executive'
  },
  {
    id: '2',
    parentId: '1',
    name: 'Sarah Johnson',
    position: 'CTO',
    email: 'sarah.johnson@company.com',
    employeeId: '4092',
    level: 'M3',
    avatar: 'assets/images/users/avatar-1.jpg',
    department: 'Technology'
  },
  {
    id: '3',
    parentId: '1',
    name: 'Michael Chen',
    position: 'CFO',
    email: 'michael.chen@company.com',
    employeeId: '4093',
    level: 'M3',
    avatar: 'assets/images/users/avatar-2.jpg',
    department: 'Finance'
  },
  {
    id: '4',
    parentId: '1',
    name: 'Emily Rodriguez',
    position: 'CHRO',
    email: 'emily.rodriguez@company.com',
    employeeId: '4094',
    level: 'M3',
    avatar: 'assets/images/users/avatar-3.jpg',
    department: 'Human Resources'
  },
  {
    id: '5',
    parentId: '2',
    name: 'David Kim',
    position: 'Senior Developer',
    email: 'david.kim@company.com',
    employeeId: '4095',
    level: 'M2',
    avatar: 'assets/images/users/avatar-4.jpg',
    department: 'Technology'
  },
  {
    id: '6',
    parentId: '2',
    name: 'Lisa Wang',
    position: 'DevOps Engineer',
    email: 'lisa.wang@company.com',
    employeeId: '4096',
    level: 'M2',
    avatar: 'assets/images/users/avatar-5.jpg',
    department: 'Technology'
  },
  {
    id: '7',
    parentId: '3',
    name: 'Robert Smith',
    position: 'Financial Analyst',
    email: 'robert.smith@company.com',
    employeeId: '4097',
    level: 'M2',
    avatar: 'assets/images/users/avatar-6.jpg',
    department: 'Finance'
  }
];
