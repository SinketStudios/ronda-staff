import { getStaffMe } from './api';

export async function getCurrentStaff() {
  return await getStaffMe();
}
