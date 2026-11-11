'use client';

import { useParams } from 'next/navigation';
import CourseParticipantView from '@/components/courses/CourseParticipantView';

export default function OspitePresenzePage() {
  const params = useParams<{ id: string; guestName: string }>();
  return (
    <CourseParticipantView
      area="admin"
      courseId={params.id}
      guestName={decodeURIComponent(params.guestName)}
    />
  );
}
