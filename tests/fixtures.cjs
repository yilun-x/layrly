const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#c9bfe1"/><path d="M0 480 280 120 640 480" fill="#9d8eae"/><circle cx="480" cy="110" r="45" fill="#f4ddc6"/></svg>');
// Local page data for exercising the nested wrappers and controls used by X.
const people = ['studio.sora','formarchive','linea','quietforms','atelier17','paperwork'].map(s => s.replace('.', '_'));
const colors = ['#7b7191','#ce965f','#779286','#446779','#a8737b','#7e8271'];
function avatar(n) {
  const color = colors[(n-1)%colors.length];
  return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${color}"/><circle cx="14" cy="16" r="12" fill="#f0dcca"/><path d="m6 48 24-30 18 30" fill="#34383d"/></svg>`);
}
const nativeIcon = '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="8"/></svg>';
const samplePhoto = process.env.LAYRLY_FIXTURE_PHOTO_PATH
  ? 'data:image/jpeg;base64,' + require('node:fs').readFileSync(process.env.LAYRLY_FIXTURE_PHOTO_PATH).toString('base64')
  : image;
function xPost(n) {
  const name = people[(n-1)%people.length];
  const imageSrc = samplePhoto;
  const media = `<div><a href="/${name}/status/${n}/photo/1"><div data-testid="tweetPhoto"><img src="${imageSrc}" width="640" height="480" alt="Landscape ${n}"></div></a></div>`;
  const button = (id, label, value='', cls='') => `<div><button data-testid="${id}" class="${cls}" aria-label="${label}">${id==='like' ? '<div><div class="native-heart">'+nativeIcon+'</div><div><span data-testid="app-text-transition-container">'+value+'</span></div></div>' : nativeIcon+'<span>'+value+'</span>'}</button></div>`;
  return `<div data-testid="cellInnerDiv"><article data-testid="tweet"><div><div><div data-testid="Tweet-User-Avatar"><a href="/${name}"><img src="${avatar(n)}" width="32" height="32" alt=""></a></div></div><div>
    <header><div data-testid="User-Name"><a href="/${name}"><span>${name}</span></a> <a href="/${name}/status/${n}"><time>· 2h</time></a></div><button aria-label="Grok actions">Grok</button><button aria-label="More">···</button></header>
    <div><div data-testid="tweetText">A different perspective on the same landscape. ${n}</div>${n === 2 ? '' : media}</div>
    <div role="group">${button('reply','Reply','4','comment')}${button('retweet','Repost','12')}${button('like','Like','99','like')}<div><a href="/${name}/status/${n}/analytics" aria-label="View post analytics">1.7K</a></div>${button('bookmark','Bookmark')}${button('share','Share post')}</div>
    </div></div></article></div>`;
}
const igPost = n => `<article><header><a href="/designer/">Studio ${n}</a></header><div><img src="${image}" width="640" height="480" alt="Landscape ${n}"></div><section><button class="like" aria-label="Like">♡</button><button class="comment">Comment</button><button>Save</button></section><p>A different perspective on the same landscape.</p><form><input aria-label="Add a comment"><button type="button">Post</button></form></article>`;
const baseStyle = `<style>body{margin:0;font:14px Arial;background:#fff;color:#222}header[role=banner]{position:fixed;width:240px;padding:25px}main[role=main]{margin-left:250px;display:flex}main[role=main]>div{display:flex}article{border-bottom:1px solid #ddd;padding:18px}article header{padding:6px 0 14px}article img{display:block;max-width:100%;height:auto}button{padding:8px;border:0;background:transparent}a{color:inherit}#timeline{width:100%}[data-testid=primaryColumn]{width:650px}[data-testid=sidebarColumn]{width:250px;padding:20px}.ig-main{margin:30px auto!important;width:900px;display:block!important}.ig-row{display:flex;gap:4px}.ig-row>a{flex:1;aspect-ratio:1;overflow:hidden}.ig-row img{width:100%;height:100%;object-fit:cover}article form{padding:10px}article p{line-height:1.6}</style>`;
const interaction = `<script>document.addEventListener('click',e=>{if(e.target.matches('.like')){e.target.setAttribute('aria-pressed',e.target.getAttribute('aria-pressed')!=='true');if(e.target.dataset.testid){const liked=e.target.getAttribute('aria-pressed')==='true';e.target.dataset.testid=liked?'unlike':'like';e.target.querySelector('.native-heart').innerHTML=liked?'<div class="native-like-sprite"></div>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';e.target.querySelector('[data-testid="app-text-transition-container"]').textContent=liked?'100':'99'}else{e.target.textContent='Liked'}}if(e.target.matches('.comment')){let input=document.createElement('input');input.setAttribute('aria-label','Reply text');e.target.parentElement.append(input);input.focus()}});</script>`;
function notificationPage() {
  const date = new Date();
  const row = (n, name, action) => {
    date.setDate(date.getDate() - (n === 2 ? 1 : 0));
    return `<div data-testid="cellInnerDiv"><article data-testid="notification"><div style="display:flex"><div><svg></svg></div><div style="display:flex;flex:1"><div style="flex:1"><div><ul><li><a href="/${name}"><img src="${avatar(n)}" width="36" height="36" alt=""></a></li></ul></div><div dir="ltr"><a href="/${name}"><strong>${name}</strong></a> ${action} <a href="/${name}/status/${n}"><time datetime="${date.toISOString()}">${n}h</time></a></div></div></div></div></article></div>`;
  };
  return '<div><h2>Notifications</h2></div><nav><div role="tablist"><a role="tab" href="/notifications">All</a><a role="tab" href="/notifications/mentions">Mentions</a></div></nav><section>' +
    row(1,'formarchive','liked your post.') + row(2,'quietforms','replied to your post.') + '</section>';
}
// Model X's ordinary same-document notification navigation, including history.
const notificationRouter = `<script>(() => {
  const main=document.querySelector('[data-testid="primaryColumn"]'), feed=main.innerHTML;
  const notifications=${JSON.stringify(notificationPage())};
  let open=false;
  function render() {
    const next=location.pathname.startsWith('/notifications');
    if (!next && !open) return;
    open=next;
    main.innerHTML=open ? notifications : feed;
    if(open){
      document.querySelector('header nav a[href="/notifications"]').setAttribute('aria-label','Notifications');
      for(const a of main.querySelectorAll('[role=tab]')) a.setAttribute('aria-selected',String(location.pathname===a.pathname));
    }
    scrollTo(0,0);
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('a');
    if(!a||!a.pathname.startsWith('/notifications')||e.metaKey||e.ctrlKey) return;
    e.preventDefault(); history.pushState({},'',a.href); render();
  });
  window.addEventListener('popstate',render); render();
})();</script>`;
function x(virtual = false) {
  return `<!doctype html><html lang="en"><head>${baseStyle}</head><body><style>[data-testid=primaryColumn]{background:black}article [data-testid=User-Name] a,article time,article [role=group] button span{font:400 13px/16px Arial;letter-spacing:.2px}article header{display:flex;align-items:center;gap:8px}article header [data-testid=User-Name]{flex:1}article header a,article [data-testid=Tweet-User-Avatar] a{text-decoration:none}article header button{color:inherit}article [data-testid=Tweet-User-Avatar] img{border-radius:100%}article [role=group] button{display:flex;align-items:center;gap:5px;padding:0;height:36px;cursor:pointer}article .like>div{display:flex;align-items:center;gap:5px}article .native-heart{display:flex;align-items:center;justify-content:center}article .native-like-sprite{width:60px;margin-left:-18px;height:30px;background:red}article [role=group] svg{pointer-events:none}article .like *{pointer-events:none}article [role=group] span{pointer-events:none}aside{padding:12px}aside h2{font:bold 14px system-ui}aside button{float:right}</style><header role="banner"><div><h1><a href="/home">𝕏</a></h1><nav><a href="/home">Home</a><a href="/explore">Explore</a><a href="/notifications">Notifications</a><a href="/i/chat">Chat</a><a href="/i/grok">Grok</a><a href="/i/jf/creators/studio">Creator Studio</a><a href="/i/history">History</a><a href="/i/premium_sign_up">Premium</a><a data-testid="AppTabBar_Profile_Link" href="/designer">Profile</a><button data-testid="AppTabBar_More_Menu">More</button></nav><a href="/compose/post">Post</a><button data-testid="SideNav_AccountSwitcher_Button"><img src="${avatar(6)}" width="24" height="24" alt="">Account</button></div></header><button data-testid="GrokDrawerHeader" aria-label="Grok window">Grok</button><button data-testid="chat-drawer-main" aria-label="Chat">Chat</button><main role="main"><div><div data-testid="primaryColumn"><div style="position:sticky"><nav><div role="tablist"><button role="tab" aria-selected="true">For you</button><button role="tab">Following</button></div></nav></div><div><div data-testid="tweetTextarea_0" contenteditable="true"></div></div><section><div id="timeline">${[1,2,3,4,5,6].map(xPost).join('')}</div></section></div><div data-testid="sidebarColumn"><div style="position:fixed;background:black;border:1px solid #444"><aside aria-label="Who to follow"><h2>Suggested for you</h2><div data-testid="UserCell">atelier17 <button data-testid="17-follow">Follow</button></div></aside></div></div></div></main>${virtual ? '<style>[data-testid=cellInnerDiv]{position:absolute;transform:translateY(10px)}</style>' : ''}${interaction}${notificationRouter}</body></html>`;
}
function instagram(grid = false) {
  const content = grid ? `<header><h1>design.studio</h1><p>Objects, spaces & everyday observations.</p><button>Follow</button></header><nav>Posts · Reels · Tagged</nav><div id="ig-grid">${[0,1].map(row=>`<div class="ig-row">${[1,2,3].map(n=>`<a href="/p/post${row*3+n}/"><img src="${image}" alt="Studio ${n}"></a>`).join('')}</div>`).join('')}</div>` : `<div id="ig-feed">${[1,2,3].map(igPost).join('')}</div>`;
  return `<!doctype html><html lang="en"><head>${baseStyle}</head><body><header role="banner"><strong>Instagram</strong><nav><p>Home</p><p>Search</p><p>Messages</p></nav></header><main class="ig-main" role="main">${content}</main><aside id="recommendations">Suggested for you</aside>${interaction}</body></html>`;
}
module.exports = { x, instagram, xPost, igPost };
