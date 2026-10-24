import { describe, it, expect } from 'vitest';
import { calculateValidWorkMinutes, calculateActualLabor } from '../labor-calculation.util.js';

describe('calculateValidWorkMinutes', () => {
  it('tru nghi trua khi lam 08:00-16:30', () => {
    // Total 510 min - 90 min nghi trua = 420 min = 7 gio
    expect(calculateValidWorkMinutes('2026-10-25T08:00:00', '2026-10-25T16:30:00')).toBeCloseTo(420, 2);
  });

  it('tru ca nghi trua va nghi tang ca khi lam 08:00-20:30', () => {
    // Total 750 min - 90 - 30 = 630 min = 10.5 gio
    expect(calculateValidWorkMinutes('2026-10-25T08:00:00', '2026-10-25T20:30:00')).toBeCloseTo(630, 2);
  });

  it('khong tru nghi trua khi chi lam 13:00-17:00', () => {
    // Nghi trua 11:30 < start 13:00 => khong overlap
    // Nghi tang ca 16:30-17:00 overlap: 30 min
    // Valid = 240 - 30 = 210 min
    expect(calculateValidWorkMinutes('2026-10-25T13:00:00', '2026-10-25T17:00:00')).toBeCloseTo(210, 2);
  });

  it('tru mot phan nghi trua khi lam 12:00-14:00', () => {
    // Nghi trua overlap: 12:00-13:00 = 60 min
    // Valid = 120 - 60 = 60 min
    expect(calculateValidWorkMinutes('2026-10-25T12:00:00', '2026-10-25T14:00:00')).toBeCloseTo(60, 2);
  });

  it('tra 0 khi end <= start', () => {
    expect(calculateValidWorkMinutes('2026-10-25T10:00:00', '2026-10-25T09:00:00')).toBe(0);
    expect(calculateValidWorkMinutes('2026-10-25T10:00:00', '2026-10-25T10:00:00')).toBe(0);
  });

  it('tra 0 khi input khong hop le', () => {
    expect(calculateValidWorkMinutes(null, '2026-10-25T10:00:00')).toBe(0);
    expect(calculateValidWorkMinutes('invalid', 'invalid')).toBe(0);
  });
});

describe('calculateActualLabor', () => {
  it('tinh dung theo spec vi du 1: 7 gio x 3 nguoi', () => {
    // 420 min * 3 / 480 = 2.625 cong
    expect(calculateActualLabor(420, 3)).toBeCloseTo(2.625, 4);
  });

  it('tinh dung theo spec vi du 2: 10.5 gio x 3 nguoi', () => {
    // 630 min * 3 / 480 = 3.9375 cong
    expect(calculateActualLabor(630, 3)).toBeCloseTo(3.9375, 4);
  });

  it('tra 0 khi workerCount = 0', () => {
    expect(calculateActualLabor(420, 0)).toBe(0);
  });

  it('tra 0 khi validWorkMinutes = 0', () => {
    expect(calculateActualLabor(0, 3)).toBe(0);
  });
});
