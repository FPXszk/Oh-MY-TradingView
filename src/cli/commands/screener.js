import { register } from '../router.js';
import { runMinervinScreener } from '../../core/minervini-screener.js';
import { applyCompaction, renderCompactPayload } from '../../core/output-compaction.js';
import { attachArtifactWarning, tryWriteRawArtifact } from '../../core/output-artifacts.js';

register('screener', {
  description: 'Stock screener (no CDP required)',
  subcommands: new Map([
    [
      'minervini',
      {
        description: 'Screen US stocks by Minervini trend-template conditions',
        options: {
          limit: { type: 'string', description: 'Max results to return (default: 50, max: 200)' },
          compact: { type: 'boolean', short: 'c', description: 'Emit compact summary output' },
        },
        handler: async (opts) => {
          const result = await runMinervinScreener({
            limit: opts.limit ? Number(opts.limit) : undefined,
          });
          if (!opts.compact) return result;
          const artifactInfo = await tryWriteRawArtifact('screener_minervini', {}, result, { compact: true });
          return renderCompactPayload(applyCompaction(
            'screener_minervini',
            attachArtifactWarning(result, artifactInfo),
            artifactInfo.artifactPath ? { artifactPath: artifactInfo.artifactPath } : undefined,
          ));
        },
      },
    ],
  ]),
});
