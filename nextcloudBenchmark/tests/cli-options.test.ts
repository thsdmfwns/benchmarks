import { describe, expect, it } from 'vitest';
import { parseCliArgs } from '../src/cli-options.js';

describe('parseCliArgs', () => {
  it('parses required benchmark arguments', () => {
    const cli = parseCliArgs([
      '--base-url',
      'http://localhost:8080/',
      '--username',
      'demo',
      '--password',
      'secret',
      '--config',
      './benchmark.config.json',
      '--runs',
      '5',
      '--output-dir',
      './out',
      '--headless',
    ]);

    expect(cli.baseUrl).toBe('http://localhost:8080');
    expect(cli.username).toBe('demo');
    expect(cli.password).toBe('secret');
    expect(cli.runs).toBe(5);
    expect(cli.headless).toBe(true);
  });

  it('throws on invalid run count', () => {
    expect(() =>
      parseCliArgs([
        '--base-url',
        'http://localhost:8080',
        '--username',
        'demo',
        '--password',
        'secret',
        '--config',
        './benchmark.config.json',
        '--runs',
        '0',
      ]),
    ).toThrow(/positive integer/i);
  });
});
