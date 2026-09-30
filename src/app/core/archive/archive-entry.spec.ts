import { boxName, formatArchiveId, sortByLaborId, toArchiveEntry } from './archive-entry';

describe('archive-entry', () => {
  it('übernimmt bekannte Spalten und setzt fehlende auf null', () => {
    const entry = toArchiveEntry('k1', { labor: 'Graz', probenjahr: 2020, box: 'box2', foo: 'x' });

    expect(entry?.values.labor).toBe('Graz');
    expect(entry?.values.probenjahr).toBe(2020);
    expect(entry?.values.notiz).toBeNull();
    expect(entry?.box).toBe('box2');
    expect(entry && 'foo' in entry.values).toBe(false);
  });

  it('nutzt die Fallback-Box, wenn keine Box im Datensatz steht', () => {
    expect(toArchiveEntry('k1', { labor: 'Wien' }, 'box3')?.box).toBe('box3');
    expect(toArchiveEntry('k1', { labor: 'Wien', box: 'ungueltig' })?.box).toBe('archiv');
  });

  it('lehnt ungültige Rohdaten ab', () => {
    expect(toArchiveEntry('k1', null)).toBeNull();
    expect(toArchiveEntry('k1', 'text')).toBeNull();
  });

  it('bildet Boxnummern auf Box-Namen ab', () => {
    expect(boxName(1)).toBe('box1');
    expect(boxName(4)).toBe('box4');
    expect(boxName(9)).toBe('archiv');
  });

  it('sortiert nach ID Labor natürlich', () => {
    const entries = ['OT-10', 'OT-2', 'OT-1'].map((id) => toArchiveEntry(id, { idLabor: id }));
    const sorted = sortByLaborId(entries.filter((entry) => entry !== null));

    expect(sorted.map((entry) => entry.values.idLabor)).toEqual(['OT-1', 'OT-2', 'OT-10']);
  });

  it('formatiert die fortlaufende ID mit führenden Nullen', () => {
    expect(formatArchiveId(1)).toBe('L001');
    expect(formatArchiveId(42)).toBe('L042');
    expect(formatArchiveId(1000)).toBe('L1000');
  });
});
