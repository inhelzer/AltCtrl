const list=document.querySelector('#project-list');
const palette={blue:'#4386eb',red:'#ff1010',green:'#25ad27',ice:'#7ea9e9'};
function mediaPlaceholder(p,i=1){return `<div class="media"><span>${p.id} / MEDIA ${i}</span><small>Replace with project media</small></div>`}
function render(items){list.innerHTML=items.map((p,i)=>`<article class="project" data-tags="${p.tags.join(' ')}" style="--accent:${palette[p.accent]||palette.blue}">
<div class="copy"><div class="id">${p.id}</div><h2>${p.name}</h2>${p.subtitle?`<p class="subtitle">${p.subtitle}</p>`:''}<h3>How it Works?</h3><p>${p.how}</p>${p.credits?`<p class="credits">${p.credits}</p>`:''}</div>
<div class="visual">${mediaPlaceholder(p,1)}${i%3===1?mediaPlaceholder(p,2):''}</div><a class="up" href="#projects">⌃</a></article>`).join('')}
render(window.PROJECTS);
