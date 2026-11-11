'use client';

import { useParams } from 'next/navigation';
import CourseParticipantView from '@/components/courses/CourseParticipantView';

export default function MaestroPartecipantePresenzePage() {
  const params = useParams<{ id: string; userId: string }>();
  return <CourseParticipantView area="maestro" courseId={params.id} userId={params.userId} />;
}
