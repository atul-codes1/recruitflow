import { getAllJobs } from '@/lib/db';
import JobsClient from './JobsClient';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const jobs = await getAllJobs();
  return <JobsClient initialJobs={jobs} />;
}
