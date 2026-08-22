import fs from'fs';import path from'path';
const source=fs.readFileSync(path.join(__dirname,'ProjectDetail.js'),'utf8');
test('Project Detail reacts to query changes and focuses the requested governance field',()=>{expect(source).toContain('projectHubTabFromSearch(location.search)');expect(source).toContain('setTab(requestedTab)');expect(source).toContain('focus==="owner"?ownerInput.current');expect(source).toContain('focus==="sponsor"?sponsorInput.current');expect(source).toContain('id="project-owner"');expect(source).toContain('id="project-sponsor"')});
test('Define deep links remain in professional Project Hub routing',()=>{expect(source).not.toMatch(/projectHubTabFromSearch[\s\S]{0,200}guided/i)});
