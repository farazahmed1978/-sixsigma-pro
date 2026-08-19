import {getProjectAssetContext} from './assetContext';
import {ASSET_TYPES} from '../config/assetConfig';

const asset = overrides => ({
  id: 'asset-1', projectId: 'p1', suiteId: 'project-management', name: 'File.pdf', description: '',
  type: 'document', mimeType: 'application/pdf', size: 1000, url: 'https://example/asset-1', tags: [],
  stage: 'Planning', uploadedBy: 'user-1', uploadedAt: '2026-08-01T00:00:00.000Z', links: [], metadata: {},
  ...overrides,
});

describe('getProjectAssetContext — top level', () => {
  test('handles an empty asset list without throwing', () => {
    const context = getProjectAssetContext('p1', []);
    expect(context.totalCount).toBe(0);
    expect(context.totalStorageBytes).toBe(0);
    expect(context.linkedCount).toBe(0);
    expect(context.unlinkedCount).toBe(0);
    expect(context.recentlyUploaded).toEqual([]);
    expect(context.byLinkedArtifact).toEqual([]);
  });

  test('defaults the assets argument to an empty array when omitted', () => {
    expect(() => getProjectAssetContext('p1')).not.toThrow();
  });

  test('is a pure function of its inputs — calling it twice with the same data returns equal aggregates', () => {
    const assets = [asset()];
    const first = getProjectAssetContext('p1', assets);
    const second = getProjectAssetContext('p1', assets);
    expect(first.totalCount).toBe(second.totalCount);
    expect(first.byType).toEqual(second.byType);
  });

  test('returns a JSON-serializable, structured object', () => {
    const context = getProjectAssetContext('p1', [asset()]);
    expect(() => JSON.stringify(context)).not.toThrow();
    expect(context.projectId).toBe('p1');
    expect(typeof context.computedAt).toBe('string');
  });

  test('only aggregates assets belonging to the given project — no cross-project visibility', () => {
    const assets = [asset({id: 'a1', projectId: 'p1'}), asset({id: 'a2', projectId: 'p2'})];
    const context = getProjectAssetContext('p1', assets);
    expect(context.totalCount).toBe(1);
    expect(context.recentlyUploaded.map(item => item.id)).toEqual(['a1']);
  });
});

describe('byType', () => {
  test('every known asset type is present as a key, even at zero', () => {
    const context = getProjectAssetContext('p1', []);
    ASSET_TYPES.forEach(type => expect(context.byType[type]).toBe(0));
  });

  test('counts assets correctly per type', () => {
    const assets = [asset({id: 'a1', type: 'document'}), asset({id: 'a2', type: 'document'}), asset({id: 'a3', type: 'image'})];
    const context = getProjectAssetContext('p1', assets);
    expect(context.byType.document).toBe(2);
    expect(context.byType.image).toBe(1);
    expect(context.byType.video).toBe(0);
  });
});

describe('byStage', () => {
  test('groups by stage and falls back to "Unassigned" for assets with no stage', () => {
    const assets = [asset({id: 'a1', stage: 'Planning'}), asset({id: 'a2', stage: 'Planning'}), asset({id: 'a3', stage: ''})];
    const context = getProjectAssetContext('p1', assets);
    expect(context.byStage.Planning).toBe(2);
    expect(context.byStage.Unassigned).toBe(1);
  });
});

describe('byLinkedArtifact', () => {
  test('aggregates asset count and asset ids per unique linked artifact, most-linked first', () => {
    const assets = [
      asset({id: 'a1', links: [{id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'}]}),
      asset({id: 'a2', links: [{id: 'l2', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'}]}),
      asset({id: 'a3', links: [{id: 'l3', artifactType: 'document', artifactId: 'doc-1', artifactLabel: 'Risk Register'}]}),
    ];
    const context = getProjectAssetContext('p1', assets);
    expect(context.byLinkedArtifact).toHaveLength(2);
    expect(context.byLinkedArtifact[0]).toMatchObject({artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay', assetCount: 2, assetIds: ['a1', 'a2']});
    expect(context.byLinkedArtifact[1]).toMatchObject({artifactType: 'document', artifactId: 'doc-1', assetCount: 1});
  });

  test('an asset linked to multiple artifacts contributes to every bucket', () => {
    const assets = [asset({id: 'a1', links: [
      {id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'Vendor delay'},
      {id: 'l2', artifactType: 'action', artifactId: 'action-1', artifactLabel: 'Follow up'},
    ]})];
    const context = getProjectAssetContext('p1', assets);
    expect(context.byLinkedArtifact).toHaveLength(2);
  });
});

describe('linkedCount / unlinkedCount', () => {
  test('correctly splits linked vs unlinked assets', () => {
    const assets = [
      asset({id: 'a1', links: [{id: 'l1', artifactType: 'risk', artifactId: 'risk-1', artifactLabel: 'x'}]}),
      asset({id: 'a2', links: []}),
    ];
    const context = getProjectAssetContext('p1', assets);
    expect(context.linkedCount).toBe(1);
    expect(context.unlinkedCount).toBe(1);
  });
});

describe('recentlyUploaded', () => {
  test('sorts newest first and caps at 10', () => {
    const assets = Array.from({length: 15}, (_, index) => asset({id: `a${index}`, uploadedAt: new Date(2026, 0, index + 1).toISOString()}));
    const context = getProjectAssetContext('p1', assets);
    expect(context.recentlyUploaded).toHaveLength(10);
    expect(context.recentlyUploaded[0].id).toBe('a14');
    expect(context.recentlyUploaded[9].id).toBe('a5');
  });

  test('each entry is a compact summary, not the full asset record', () => {
    const context = getProjectAssetContext('p1', [asset({id: 'a1', description: 'long description text', metadata: {big: 'blob'}})]);
    expect(context.recentlyUploaded[0]).toEqual({id: 'a1', name: 'File.pdf', type: 'document', stage: 'Planning', uploadedAt: '2026-08-01T00:00:00.000Z', uploadedBy: 'user-1'});
  });
});

describe('totalStorageBytes', () => {
  test('sums size across every asset, treating missing/non-numeric size as 0', () => {
    const assets = [asset({id: 'a1', size: 1000}), asset({id: 'a2', size: 2000}), asset({id: 'a3', size: undefined})];
    const context = getProjectAssetContext('p1', assets);
    expect(context.totalStorageBytes).toBe(3000);
  });
});
