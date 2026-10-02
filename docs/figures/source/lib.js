// connect(a, b, {dash, arrow:'open'|'filled'|'none', label, from:[fx,fy], to:[fx,fy]})
function rectOf(id){const fig=document.getElementById('fig').getBoundingClientRect();const r=document.getElementById(id).getBoundingClientRect();return {x:r.left-fig.left,y:r.top-fig.top,w:r.width,h:r.height,cx:r.left-fig.left+r.width/2,cy:r.top-fig.top+r.height/2,ell:document.getElementById(id).classList.contains('ell')};}
function clip(r,tx,ty){const dx=tx-r.cx,dy=ty-r.cy;if(!dx&&!dy)return[r.cx,r.cy];
 if(r.ell){const a=r.w/2,b=r.h/2,t=1/Math.sqrt((dx*dx)/(a*a)+(dy*dy)/(b*b));return[r.cx+dx*t,r.cy+dy*t];}
 const sx=dx?(r.w/2)/Math.abs(dx):Infinity,sy=dy?(r.h/2)/Math.abs(dy):Infinity,s=Math.min(sx,sy);return[r.cx+dx*s,r.cy+dy*s];}
let svg;function ensure(){if(svg)return svg;const f=document.getElementById('fig');svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','wires');svg.setAttribute('width',f.offsetWidth);svg.setAttribute('height',f.offsetHeight);
 svg.innerHTML='<defs><marker id="open" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse"><path d="M1,1 L11,6 L1,11" fill="none" stroke="#222" stroke-width="1.5"/></marker><marker id="filled" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L12,6 L0,12 z" fill="#222"/></marker></defs>';f.appendChild(svg);return svg;}
function anchor(r,f){return f?[r.x+r.w*f[0],r.y+r.h*f[1]]:null}
function connect(a,b,o={}){const s=ensure(),A=rectOf(a),B=rectOf(b);
 let p1=anchor(A,o.from),p2=anchor(B,o.to);
 const t1=p2||[B.cx,B.cy],t0=p1||[A.cx,A.cy];
 if(!p1)p1=clip(A,t1[0],t1[1]); if(!p2)p2=clip(B,t0[0],t0[1]);
 let d;
 if(o.elbow==='hv') d=`M${p1[0]},${p1[1]} L${p2[0]},${p1[1]} L${p2[0]},${p2[1]}`;
 else if(o.elbow==='vh') d=`M${p1[0]},${p1[1]} L${p1[0]},${p2[1]} L${p2[0]},${p2[1]}`;
 else if(o.elbow==='vhv'){const my=(p1[1]+p2[1])/2;d=`M${p1[0]},${p1[1]} L${p1[0]},${my} L${p2[0]},${my} L${p2[0]},${p2[1]}`;}
 else if(o.via) d=`M${p1[0]},${p1[1]} `+o.via.map(q=>`L${q[0]},${q[1]}`).join(' ')+` L${p2[0]},${p2[1]}`;
 else d=`M${p1[0]},${p1[1]} L${p2[0]},${p2[1]}`;
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke','#222');path.setAttribute('stroke-width','1.5');
 if(o.dash)path.setAttribute('stroke-dasharray','6 4');const ar=o.arrow===undefined?'filled':o.arrow;if(ar!=='none')path.setAttribute('marker-end',`url(#${ar})`);s.appendChild(path);
 const lab=(txt,x,y)=>{const l=document.createElement('div');l.className='lbl';l.innerHTML=txt;l.style.left=x+'px';l.style.top=y+'px';document.getElementById('fig').appendChild(l)};
 if(o.label){let x=(p1[0]+p2[0])/2,y=(p1[1]+p2[1])/2;if(o.elbow==='hv'){x=(p1[0]+p2[0])/2;y=p1[1];}if(o.elbow==='vh'){x=p1[0];y=(p1[1]+p2[1])/2;}if(o.lpos){x=p1[0]+(p2[0]-p1[0])*o.lpos;y=p1[1]+(p2[1]-p1[1])*o.lpos;}lab(o.label,x+(o.dx||0),y+(o.dy||0));}
 if(o.m1){lab(o.m1,p1[0]+(o.m1d||[10,-10])[0],p1[1]+(o.m1d||[10,-10])[1]);} if(o.m2){lab(o.m2,p2[0]+(o.m2d||[10,-10])[0],p2[1]+(o.m2d||[10,-10])[1]);}
}
function place(id,x,y,w,h){const e=document.getElementById(id);e.style.left=x+'px';e.style.top=y+'px';if(w)e.style.width=w+'px';if(h)e.style.height=h+'px';}
