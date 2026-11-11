/**
 * @jest-environment node
 *
 * Test per gli helper condivisi di corsi, sfide Arena, news, video e blocchi campo.
 */

import {
  computeLessonDates,
  getCourseCourtForDate,
  getCourseTimeForDate,
  localDateStr,
} from '@/lib/courses/schedule';
import {
  SCORE_PATTERN,
  buildScoreGrid,
  getPointsFromScore,
  getWinnerIdFromScore,
  getWinnerName,
} from '@/lib/arena/challengeDisplay';
import { formatNewsDate, isPublishedNews, normalizeLegacyTitle } from '@/lib/news/display';
import { getYouTubeVideoId } from '@/lib/utils/youtube';
import {
  applyPickedDate,
  buildBlockReason,
  buildCourtBlocks,
  parseBlockReason,
} from '@/lib/courts/blocks';
import { getBlockStyle, getBlockTitle } from '@/lib/courts/blockDisplay';
import { formatDateInputLabel, parseDateInput, toInputDateValue } from '@/lib/utils/dateInput';

const iso = (dates: Date[]) => dates.map((d) => d.toISOString().split('T')[0]);

describe('calendario corsi', () => {
  // Lunedì e mercoledì dal 2 al 15 marzo 2026 (il 2 è un lunedì)
  const course = {
    start_date: '2026-03-02',
    end_date: '2026-03-15',
    schedule_days: ['lun', 'mer'],
    cancelled_dates: ['2026-03-04'],
    extra_dates: ['2026-03-06'],
    schedule_time: '18:00 - 19:00',
    court_name: 'Campo 1',
    schedule_periods: [{ days: ['mer'], time: '17:00 - 18:00', courts: ['Campo 2', 'Campo 3'] }],
    lesson_overrides: { '2026-03-09': 'Campo 4' },
    lesson_time_overrides: { '2026-03-09': '20:00 - 21:00' },
  };

  it('salta le date annullate e ignora le extra di default', () => {
    expect(iso(computeLessonDates(course))).toEqual(['2026-03-02', '2026-03-09', '2026-03-11']);
  });

  it('aggiunge le lezioni extra in ordine con includeExtra', () => {
    expect(iso(computeLessonDates(course, { includeExtra: true }))).toEqual([
      '2026-03-02',
      '2026-03-06',
      '2026-03-09',
      '2026-03-11',
    ]);
  });

  it('senza giorni o date non produce lezioni', () => {
    expect(computeLessonDates({ ...course, schedule_days: [] })).toEqual([]);
    expect(computeLessonDates({ ...course, end_date: null })).toEqual([]);
  });

  it('risolve campo e orario: override > periodo > valore del corso', () => {
    expect(getCourseCourtForDate(course, '2026-03-09')).toBe('Campo 4');
    expect(getCourseTimeForDate(course, '2026-03-09')).toBe('20:00 - 21:00');
    expect(getCourseCourtForDate(course, '2026-03-11')).toBe('Campo 2, Campo 3');
    expect(getCourseTimeForDate(course, '2026-03-11')).toBe('17:00 - 18:00');
    expect(getCourseCourtForDate(course, '2026-03-02')).toBe('Campo 1');
    expect(getCourseTimeForDate(course, '2026-03-02')).toBe('18:00 - 19:00');
  });

  it('formatta la data locale come YYYY-MM-DD', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('punteggio sfide Arena', () => {
  it('valida il formato del punteggio', () => {
    expect(SCORE_PATTERN.test('6-4, 3-6, 7-5')).toBe(true);
    expect(SCORE_PATTERN.test('6-4;3-6')).toBe(false);
  });

  it('deduce il vincitore dai set', () => {
    expect(getWinnerIdFromScore('6-4, 3-6, 7-5', 'sfidante', 'sfidato')).toBe('sfidante');
    expect(getWinnerIdFromScore('4-6, 2-6', 'sfidante', 'sfidato')).toBe('sfidato');
    expect(getWinnerIdFromScore('6-4, 4-6', 'sfidante', 'sfidato')).toBeNull();
    expect(getWinnerIdFromScore('abc', 'sfidante', 'sfidato')).toBeNull();
  });

  it('assegna i punti in base ai set persi dal vincitore', () => {
    expect(getPointsFromScore('6-4, 6-2', 'a', 'a')).toEqual({ winnerPts: 30, loserPts: 0 });
    expect(getPointsFromScore('6-4, 3-6, 6-2, 6-1', 'a', 'a')).toEqual({
      winnerPts: 25,
      loserPts: 5,
    });
    expect(getPointsFromScore('4-6, 6-3, 5-7', 'b', 'a')).toEqual({ winnerPts: 20, loserPts: 10 });
    expect(getPointsFromScore('', 'a', 'a')).toBeNull();
  });

  it('costruisce la griglia dei set', () => {
    expect(buildScoreGrid('6-4, 3-6')).toEqual({
      sets: [
        { winner: 6, loser: 4 },
        { winner: 3, loser: 6 },
      ],
      totalWinner: 1,
      totalLoser: 1,
    });
    expect(buildScoreGrid(undefined)).toBeNull();
  });

  it('ricava il nome del vincitore', () => {
    const challenge = {
      challenger_id: 'a',
      opponent_id: 'b',
      challenger: { full_name: 'Anna' },
      opponent: { full_name: 'Bruno' },
    };
    expect(getWinnerName({ ...challenge, winner_id: 'b' })).toBe('Bruno');
    expect(getWinnerName(challenge)).toBeNull();
  });
});

describe('news e video', () => {
  it('riconosce le news pubblicate', () => {
    expect(isPublishedNews({ is_published: true })).toBe(true);
    expect(isPublishedNews({ is_published: false, stato: 'pubblicata' })).toBe(false);
    expect(isPublishedNews({ stato: 'Pubblicata' })).toBe(true);
    expect(isPublishedNews(null)).toBe(false);
  });

  it('ripulisce i titoli troncati', () => {
    expect(normalizeLegacyTitle('Sinner vince ancora ...')).toBe('Sinner vince ancora');
  });

  it('formatta la data con le iniziali maiuscole', () => {
    expect(formatNewsDate('2026-03-02T12:00:00Z')).toMatch(/^Lun 02 Mar 2026$/);
    expect(formatNewsDate(undefined)).toBe('');
  });

  it('estrae l’ID dei video YouTube', () => {
    expect(getYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeVideoId('https://example.com/video')).toBeNull();
  });
});

describe('blocchi campo', () => {
  it('compone il testo del motivo', () => {
    expect(buildBlockReason({ blockType: 'manutenzione', customBlockType: '', notes: '' })).toBe(
      'Manutenzione',
    );
    expect(
      buildBlockReason({
        blockType: 'altro',
        customBlockType: ' Gara ',
        notes: 'campo chiuso',
        blockName: 'Sociale',
      }),
    ).toBe('Sociale - Altro (Gara) - campo chiuso');
  });

  it('rilegge nome, tipo e note dal motivo', () => {
    const fields = {
      blockName: 'Sociale',
      blockType: 'altro',
      customBlockType: 'Gara',
      notes: 'campo chiuso - tutto il giorno',
    };
    expect(parseBlockReason(buildBlockReason(fields))).toEqual(fields);
    expect(parseBlockReason('Manutenzione - rete')).toEqual({
      blockName: '',
      blockType: 'manutenzione',
      customBlockType: '',
      notes: 'rete',
    });
    // Testo libero dei blocchi vecchi: tipo dedotto, oppure tutto nelle note
    expect(parseBlockReason('corsi tennis ragazzi').blockType).toBe('corsi_tennis');
    expect(parseBlockReason('Festa del circolo')).toMatchObject({
      blockType: '',
      notes: 'Festa del circolo',
    });
  });

  it('ricava il titolo del blocco', () => {
    expect(getBlockTitle('')).toBe('Blocco campo');
    expect(getBlockTitle('Altro (Gara) - sabato')).toBe('Gara - sabato');
    expect(getBlockTitle('Manutenzione - rete')).toBe('Manutenzione - rete');
  });

  it('crea un blocco per ogni giorno scelto, saltando le date escluse', () => {
    // Lunedì e mercoledì dal 2 all'11 marzo 2026 (il 2 è un lunedì)
    const blocks = buildCourtBlocks({
      court: 'Campo 1',
      startDate: '2026-03-02',
      endDate: '2026-03-11',
      weekDays: [1, 3],
      startTime: '09:00',
      endTime: '10:30',
      reason: 'Evento',
      excludedDates: ['2026-03-04'],
    });
    expect(blocks.map((b) => toInputDateValue(new Date(b.start_time)))).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-11',
    ]);
    const first = blocks[0];
    expect(new Date(first.end_time).getTime() - new Date(first.start_time).getTime()).toBe(
      90 * 60 * 1000,
    );
    expect(first).toMatchObject({ court_id: 'Campo 1', reason: 'Evento' });
  });

  it('rifiuta un periodo con la fine prima dell’inizio', () => {
    expect(() =>
      buildCourtBlocks({
        court: 'Campo 1',
        startDate: '2026-03-10',
        endDate: '2026-03-02',
        weekDays: [1],
        startTime: '09:00',
        endTime: '10:00',
        reason: 'Evento',
      }),
    ).toThrow();
  });

  it('applica la data scelta dal calendario al periodo', () => {
    const period = { startDate: '2026-03-02', endDate: '2026-03-05', weekDays: [1] };
    // Inizio spostato dopo la fine: la fine lo segue; sabato viene aggiunto ai giorni
    expect(applyPickedDate(period, 'start', parseDateInput('2026-03-07')!)).toEqual({
      startDate: '2026-03-07',
      endDate: '2026-03-07',
      weekDays: [1, 6],
    });
    // Fine prima dell'inizio: resta sull'inizio
    expect(applyPickedDate(period, 'end', parseDateInput('2026-03-01')!).endDate).toBe(
      '2026-03-02',
    );
  });

  it('riconosce il tipo di blocco dal motivo', () => {
    expect(getBlockStyle('Corso Adulti - serale').type).toBe('Corso Adulti');
    expect(getBlockStyle('Manutenzione').type).toBe('Manutenzione');
    expect(getBlockStyle('Altro (Gara)').type).toBe('Altro');
    expect(getBlockStyle('').type).toBe('Blocco');
  });

  it('legge e scrive le date degli input', () => {
    expect(parseDateInput('')).toBeNull();
    expect(toInputDateValue(parseDateInput('2026-03-02')!)).toBe('2026-03-02');
    expect(formatDateInputLabel('2026-03-02')).toBe('02/03/2026');
    expect(formatDateInputLabel('')).toBe('gg/mm/aaaa');
    expect(toInputDateValue(parseDateInput('2026-03-02T00:00:00')!)).toBe('2026-03-02');
  });
});
