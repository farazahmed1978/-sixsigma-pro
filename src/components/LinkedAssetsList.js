import React, {useEffect, useState} from 'react';
import {assetRepository} from '../repositories/assetRepository';
import {ASSET_TYPE_ICONS, ASSET_TYPE_LABELS} from '../config/assetConfig';
import './LinkedAssetsList.css';

// Read-only "Linked Files" strip shown at the bottom of a document, risk, action, issue, decision,
// or approval record. Managing links (adding/removing) happens in AssetUploadModal or the asset
// detail panel on the Files and Assets tab, never here — this component only reads and displays.
export default function LinkedAssetsList({project, artifactType, artifactId, title = 'Linked Files'}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    assetRepository.list(project.id)
      .then(all => { if (active) setAssets(all.filter(asset => (asset.links || []).some(link => link.artifactType === artifactType && link.artifactId === artifactId))); })
      .catch(() => { if (active) setAssets([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [project.id, artifactType, artifactId]);

  const openAsset = async asset => {
    const url = asset.storagePath ? await assetRepository.getSignedUrl(asset.storagePath) : asset.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading || !assets.length) return null;
  return (
    <div className="linked-assets" aria-label={title}>
      <span className="linked-assets-title">{title}</span>
      <ul>
        {assets.map(asset => (
          <li key={asset.id}>
            <i>{ASSET_TYPE_ICONS[asset.type] || '📎'}</i>
            <span>{asset.name}</span>
            <em>{ASSET_TYPE_LABELS[asset.type] || asset.type}</em>
            <button type="button" onClick={() => openAsset(asset)}>{asset.type === 'url' ? 'Open' : 'Download'}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
