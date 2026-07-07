import { getCurrentStaff } from '@/lib/auth';
import { getInfrastructureDeployments, getInfrastructureTopology } from '@/lib/api';
import { InfrastructureCanvas } from './InfrastructureCanvas';

export const dynamic = 'force-dynamic';

export default async function InfrastructurePage() {
  const staff = await getCurrentStaff();
  if (!staff) return null;

  const [topology, deployments] = await Promise.all([
    getInfrastructureTopology(),
    getInfrastructureDeployments().catch(() => null),
  ]);
  return <InfrastructureCanvas initialTopology={topology} initialDeployments={deployments} />;
}
