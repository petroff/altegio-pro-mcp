import { parseCSV } from '../csv-parser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV with headers', () => {
      const csv = 'name,phone\nAlice,+1234567890\nBob,+0987654321';
      const result = parseCSV(csv);

      expect(result).toEqual([
        { name: 'Alice', phone: '+1234567890' },
        { name: 'Bob', phone: '+0987654321' }
      ]);
    });

    it('should handle quoted fields with commas', () => {
      const csv = 'name,address\n"Smith, John","123 Main St, Apt 4"';
      const result = parseCSV(csv);

      expect(result).toEqual([
        { name: 'Smith, John', address: '123 Main St, Apt 4' }
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(parseCSV('')).toEqual([]);
      expect(parseCSV('header')).toEqual([]);
    });
  });
});
