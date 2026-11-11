'use client';

import { useParams } from 'next/navigation';
import CourseParticipantView from '@/components/courses/CourseParticipantView';

export default function PartecipantePresenzePage() {
  const params = useParams<{ id: string; userId: string }>();
  return <CourseParticipantView area="admin" courseId={params.id} userId={params.userId} />;
}
