import React from 'react';
import {Link,useParams} from 'react-router-dom';
import './ResourceStatus.css';
const labels={'user-guide':'User Guide','formula-reference':'Formula Reference','statistical-tables':'Statistical Tables','dmaic-guide':'DMAIC Guide','pmp-guide':'PMP Guide','video-tutorials':'Video Tutorials','release-notes':'Release Notes'};
export default function ResourceStatus(){const{resourceId}=useParams();const title=labels[resourceId]||'Resource';return <div className="resource-status"><article><span>RESOURCE CENTER</span><h1>{title}</h1><strong>Content in development</strong><p>This resource has a reserved production route and will be expanded without changing the surrounding platform navigation. Use the existing Guides & References collection in the meantime.</p><div><Link className="btn-primary" to="/resources">Guides & References</Link><Link className="btn-secondary" to="/projects">Back to Projects</Link></div></article></div>}
