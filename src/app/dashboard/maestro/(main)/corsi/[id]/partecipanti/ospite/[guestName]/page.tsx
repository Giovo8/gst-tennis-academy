'use client';

import { useParams } from 'next/navigation';
import CourseParticipantView from '@/components/courses/CourseParticipantView';

export default function MaestroOspitePresenzePage() {
  const params = useParams<{ id: string; guestName: string }>();
  return (
    <CourseParticipantView
      area="maestro"
      courseId={params.id}
      guestName={decodeURIComponent(params.guestName)}
    />
  );
}
