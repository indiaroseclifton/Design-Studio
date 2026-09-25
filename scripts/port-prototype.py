"""
Ports the prototype (docs/design_handoff_event_studio/Event Scenes.html) into TypeScript:

  src/engine/catalogue.gen.ts  every catalogue piece, add-on pack, template and the flower engine
  src/engine/venues.gen.ts     the 15 venue scenes

The builders are copied verbatim so they stay diffable against the prototype; every change needed for
TypeScript is an explicit, reviewable replacement below. Run with `python3 scripts/port-prototype.py`.
The output is formatted with Prettier, then parameters TypeScript reports as unused get a `_` prefix.
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'docs/design_handoff_event_studio/Event Scenes.html').read_text().split('\n')
# 1-based inclusive line ranges in the prototype
items1 = html[906 - 1:1008]
flowers = html[1009 - 1:1078]  # Flower Studio stem/bloom engine; several catalogue pieces use it
items2 = html[1079 - 1:1250]
packs = html[1251 - 1:1406]
src = '\n'.join(items1 + flowers + items2 + packs)

drops = [
    r"^function textTex\(.*?\n.*?\n.*?return t\}\n",  # ported to engine/florals.ts
    r"^const velvetM=.*\n",  # engine/materials.ts
    r"^const RUNNERS_PRE=0;\n",
    r"^const fluteGeo=.*\n",  # engine/materials.ts
    r"^const loadCustom=.*\n",  # Flower Studio custom arrangements aren't ported yet
    r"^function registerCustom\(.*\n",
    r"^loadCustom\(\)\.forEach\(registerCustom\);\n",
    r"^const CATL=.*\n",  # categories live in engine/catalogue.ts
    r"^// ---------- more catalogue ----------\n",
]
for d in drops:
    src, n = re.subn(d, '', src, flags=re.M)
    if n != 1:
        sys.exit(f'drop pattern matched {n} times: {d}')

src = src.replace('Object.assign(ITEMS,{', 'defineItems({')
src = re.sub(r"^KINDS\.(\w+)=(.*);$", r"registerKind('\1',\2);", src, flags=re.M)
src = src.replace('const _k=_s;', 'const _k=getSeedState();').replace('_s=_k;', 'setSeedState(_k);')
src = src.replace('const ITEMS={', 'export const ITEMS: Record<string, CatalogueItem> = {', 1)
src = src.replace('const PACKS=[', 'export const PACKS: Pack[] = [', 1)
src = src.replace('const TEMPLATES=[', 'export const TEMPLATES: Template[] = [', 1)
src = src.replace('const RUNNERS={', 'const RUNNERS: Record<string, [string, (p: Pal) => THREE.Material]> = {', 1)

# Give the prototype's untyped helpers real signatures (exact-match replacements on the raw source).
SIGS = {
    'function stringFlags(g,B,a,b,n,mats,sag=.35)': 'function stringFlags(g:O3,B:Builder,a:number[],b:number[],n:number,mats:Mat[],sag=.35)',
    'function P(B,bm,k,x,y,z,sx,sy,sz,rx,ry,rz,c,e=1)': 'function P(B:Builder,bm:THREE.Matrix4,k:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx:number,ry:number,rz:number,c:string,e=1)',
    'function frame(bm,x,y,z,nx,ny,nz,tw=0)': 'export function frame(bm:THREE.Matrix4,x:number,y:number,z:number,nx:number,ny:number,nz:number,tw=0)',
    'function ring(B,bm,n,r,t,len,w,y0,c,o={})': 'function ring(B:Builder,bm:THREE.Matrix4,n:number,r:number,t:number,len:number,w:number,y0:number,c:string,o:RingOpts={})',
    'function stemTo(B,bm,a,b,r,c)': 'export function stemTo(B:Builder,bm:THREE.Matrix4,a:number[],b:number[],r:number,c:string)',
    'const fc=k=>': 'export const fc=(k:string):string=>',
    'function bloomAt(B,bm,t,p,n,s,c)': 'function bloomAt(B:Builder,bm:THREE.Matrix4,t:string,p:number[],n:number[],s:number,c:string)',
    'const finMat=k=>': 'const finMat=(k:string):Mat=>',
    'function buildArrangement(g,r)': 'export function buildArrangement(g:O3,r:Arrangement)',
    'function sofaB(g,m,w,x=0,z=0,ry=0)': 'function sofaB(g:O3,m:Mat,w:number,x=0,z=0,ry=0)',
    'function starShape(r1,r2,n=5)': 'function starShape(r1:number,r2:number,n=5)',
    'const lampShade=(g,x,y,z,r,hh,c)=>': 'const lampShade=(g:O3,x:number,y:number,z:number,r:number,hh:number,c:string)=>',
    'const frameLantern=(g,B,x,z,s)=>': 'const frameLantern=(g:O3,B:Builder,x:number,z:number,s:number)=>',
    'const legs4=(g,w,d,h,m,t=.04)=>': 'const legs4=(g:O3,w:number,d:number,h:number,m:Mat,t=.04)=>',
    'const chairS=(g,m,x,z,ns)=>': 'const chairS=(g:O3,m:Mat,x:number,z:number,ns?:boolean)=>',
    'const beamM=(c,o=.14)=>': 'const beamM=(c:string,o=.14)=>',
    'const chairAt=(g,m,x,z,ry)=>': 'const chairAt=(g:O3,m:Mat,x:number,z:number,ry:number)=>',
    'const faceC=(g,m,x,z)=>': 'const faceC=(g:O3,m:Mat,x:number,z:number)=>',
    'const clothT=(g,p,geo,h=.76)=>': 'const clothT=(g:O3,p:Pal,geo:THREE.BufferGeometry,h=.76)=>',
    'const txtT=(txt,o={})=>': 'const txtT=(txt:string,o:{bg?:string;border?:string;c?:string;s?:number;f?:string;f1?:string;f2?:string}={})=>',
    'const coatRack=(g,B,x,z,w)=>': 'const coatRack=(g:O3,B:Builder,x:number,z:number,w:number)=>',
    'const PSIZE=(a)=>': 'const PSIZE=(a:string[]):Array<[string,string]>=>',
    'const cX=(g,x0,x1,y,z,r,m)=>': 'const cX=(g:O3,x0:number,x1:number,y:number,z:number,r:number,m:Mat)=>',
    'const cZ=(g,z0,z1,y,x,r,m)=>': 'const cZ=(g:O3,z0:number,z1:number,y:number,x:number,r:number,m:Mat)=>',
    'function trussBeam(g,x0,x1,y,z)': 'function trussBeam(g:O3,x0:number,x1:number,y:number,z:number)',
    'function trussLeg(g,x,z,h)': 'function trussLeg(g:O3,x:number,z:number,h:number)',
    'const FL={': 'export const FL:Record<string,FlowerDef>={',
    'const GR={': 'export const GR:Record<string,GreenDef>={',
    'const VESS={': 'export const VESS:Record<string,VesselDef>={',
    'const FCOL={': 'export const FCOL:Record<string,[string,string]>={',
}
for a, b in SIGS.items():
    if src.count(a) != 1:
        sys.exit(f'signature matched {src.count(a)} times: {a}')
    src = src.replace(a, b)

# Mixed [number, ..., 'colour'] literals iterated with forEach: `as const` keeps each position's type.
def _as_const(m):
    body = m.group(1)
    return f'({body} as const).forEach(([' if "'" in body else m.group(0)
src = re.sub(r"(\[\[[^\[\]]*(?:\],\[[^\[\]]*)*\]\])\.forEach\(\(\[", _as_const, src)

# Spot fixes where the prototype leaned on JS looseness.
FIXES = [
    ('o.position.set(...q)', 'o.position.set(q[0],q[1],q[2])'),
    ('const arm=(x,z,ry)=>', 'const arm=(x:number,z:number,ry:number)=>'),
    ('ITEMS.cake.build(s,B2,p)', "ITEMS.cake.build(s,B2,p,{m:'round',len:1.96,o:{}})"),
    ('fm=finMat(r.fin)', "fm=finMat(r.fin??'ivory')"),
    ('const list=[];(r.stems', 'const list:Array<{t:string;c:string;n:number}>=[];(r.stems'),
    ('heads=[];', 'heads:number[][]=[];'),
    ('const to=bind||mouth;', 'const to=(bind||mouth)!;'),
    ('G.h(B,frame(', 'G.h!(B,frame('),
    ('GR.pampas.h(', 'GR.pampas.h!('),
    ('LT[ch].forEach(', '(LT as Record<string,number[][]>)[ch].forEach('),
    ('const f=o=>ns?noSh(o):o;', 'const f=(o:THREE.Mesh)=>ns?noSh(o):o;'),
    ('M(...chm)', 'M(...(chm as [string,number,number]))'),
    ('rose:M(\'#d8a08a\',.3,.9)}[o.fl];', 'rose:M(\'#d8a08a\',.3,.9)}[o.fl]??silver;'),
    # Dead locals in the prototype (values computed but never used).
    ("if(chm){const c=cyl(g,.17,.17,.012,", "if(chm){cyl(g,.17,.17,.012,"),
    ("const a=mesh(g,new THREE.CylinderGeometry(.01,.8,.3,", "mesh(g,new THREE.CylinderGeometry(.01,.8,.3,"),
    ("for(const s of[-1,1]){const c=sofaB(", "for(const s of[-1,1]){sofaB("),
    ("const arm=box(g,1.6,.03,.05,", "box(g,1.6,.03,.05,"),
    ("const c=noSh(mesh(g,new THREE.ConeGeometry(1.4,.45,", "noSh(mesh(g,new THREE.ConeGeometry(1.4,.45,"),
    (",rr=Math.hypot(ps.getX(k),ps.getZ(k));", ";"),
    ("const ox=px*1.12,oz=", "const oz="),
    # Petals are drawn by engine/botany.ts (curved, shaded surfaces) instead of the prototype's squashed spheres.
    ("registerKind('petal',()=>[new THREE.SphereGeometry(1,10,7),M('#fff',.6,0,{side:THREE.DoubleSide})]);", "/* The petal kind is registered by engine/botany.ts. */"),
    ("const FINS=", "export const FINS: Record<string, string>="),
    # The Flower Studio (src/components/flower) draws cut-stem thumbnails with these.
    ("const I4=new THREE.Matrix4(),", "export const I4=new THREE.Matrix4();const "),
    ("const SHAPES=", "export const SHAPES: Record<string, string>="),
    ('const pl=noSh(mesh(g,new THREE.PlaneGeometry(len,EH),wm.clone(),x0,EH/2,z0));', 'const pl=noSh(mesh(g,new THREE.PlaneGeometry(len,EH),wm.clone(),x0,EH/2,z0)) as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;'),
    ("sage:'#a8b8a0'}[o.fab];", "sage:'#a8b8a0'}[o.fab]??'#f7f1e6';"),
    ('steps=(xx,zz,ry)=>', 'steps=(xx:number,zz:number,ry:number)=>'),
    ('const side=(len,x0,z0,ry,reps)=>', 'const side=(len:number,x0:number,z0:number,ry:number,reps:number)=>'),
]
for a, b in FIXES:
    if a not in src:
        sys.exit(f'fix not found: {a}')
    src = src.replace(a, b)

header = '''/* eslint-disable */
// GENERATED by scripts/port-catalogue.py from the prototype, then hand-fixed for TypeScript.
// Every catalogue piece, add-on pack and template from the handoff. Builders keep the prototype's
// terse style so they stay diffable against the original; shared helpers live in engine/*.ts.
import * as THREE from 'three';
import { M, box, cyl, getSeedState, jit, lathe, mesh, noSh, pick, rnd, seed, setSeedState } from '../three/utils';
import { T, tm, planks, tiles, bricks } from '../three/textures';
import { Builder, flame, registerKind } from '../three/builder';
import { brass, china, clay, coupeGeo, fluteGeo, glassM, glassOpen, gobletGeo, ironM, silver, smokeM, stoneM, tumblerGeo, velvetM, wax, wineGeo, woodM } from './materials';
import { addBloom, bloomsAlong, cluster, needle, placeB, runnerB, taper, textTex, trail } from './florals';
import { CHAIRS, PALS, clothTex, fabricMat, makeChair, type Pal } from './studio';
import type { CatalogueItem, TableLayout } from '../types';

/** Adds more pieces to ITEMS; the parameter type gives each builder its (g, B, p, c) types. */
function defineItems(defs: Record<string, CatalogueItem>) {
  Object.assign(ITEMS, defs);
}

type O3 = THREE.Object3D;
type Mat = THREE.Material;

interface RingOpts {
  off?: number;
  th?: number;
  k?: string;
  ja?: number;
  jt?: number;
  v?: number;
}

/** A cut flower head, drawn at the origin facing +y in the given frame. */
export interface FlowerDef {
  n: string;
  /** default colour key */
  c: string;
  /** size multiplier */
  s: number;
  h: (B: Builder, m: THREE.Matrix4, s: number, c: string) => void;
}

export interface GreenDef {
  n: string;
  c: string;
  /** trailing (drawn as a chain of leaves rather than a stem) */
  tr?: boolean;
  h?: (B: Builder, m: THREE.Matrix4, L: number, c: string) => void;
}

export interface VesselDef {
  n: string;
  surf: 'table' | 'floor' | 'hang';
  /** bloom size */
  b: number;
  fin?: number;
  fp: number;
}

/** A Flower Studio arrangement. */
export interface Arrangement {
  seed?: number;
  size?: number;
  vessel: string;
  fin?: string;
  shape?: string;
  stems?: Array<{ t: string; c: string; n: number }>;
  greens?: Record<string, number>;
  ribbon?: string;
}

export interface Pack {
  id: string;
  name: string;
  desc: string;
  /** existing catalogue pieces also listed under the pack's tab */
  also?: string[];
}

export interface Template {
  id: string;
  name: string;
  kind: string;
  desc: string;
  mode: TableLayout;
  cloth?: string;
  overlay?: string;
  chair?: string;
  decor?: string;
  pal: string;
  place?: string;
  /** [type, x, z, ry?] */
  items: Array<[string, number, number, number?]>;
}

'''
import subprocess
OUT = {'src/engine/catalogue.gen.ts': header + src + '\n'}

# ------------------------------------------------------------------------------------------- venues
vsrc = '\n'.join(html[456 - 1:767])
VFIXES = [
    # Realism: the prototype's near-mirror sea and lake turned a low sun into a blown-out column of glare
    # (and bloom spread it across the sand). Rougher water keeps a softer glitter path.
    ("M('#1f5a6c',.16,.3)", "new THREE.MeshPhysicalMaterial({color:'#1f5a6c',roughness:.32,specularIntensity:.28})"),
    ("M('#a98b66',.4)", "M('#a98b66',.62)"),
    ("M('#2a4a5a',.12,.35)", "new THREE.MeshPhysicalMaterial({color:'#2a4a5a',roughness:.24,specularIntensity:.4})"),
    # Lakeside pines: tiered boughs (engine/foliage.ts) instead of plain cones. The cone's origin is its centre;
    # the pine's is too, so position and scale carry over.
    ("B.add('cone',[x,h/2+.8,z],[h*.28,h,h*.28],jit('#2a4030',.06))", "B.add('pine',[x,h/2+.8,z],[h*.3,h,h*.3],jit('#2a4030',.06),[0,rnd()*6,0])"),
    # Hay bales get a straw texture and softened edges (engine/foliage.ts) instead of plain boxes.
    ("B.add('box',[-7.2,.25+l*.5,z+l*.5],[1.1,.5,.55]", "B.add('bale',[-7.2,.25+l*.5,z+l*.5],[1.1,.5,.55]"),
    ("B.add('box',[-7.1,.25,z],[1.1,.5,.55]", "B.add('bale',[-7.1,.25,z],[1.1,.5,.55]"),
    ('const SCENES=[', 'export const VENUES: VenueDef[] = ['),
    # "Your Venue" receives the uploaded photo as a build argument instead of reading a global.
    ("build(g,B,tk){const fl=mesh(g,new THREE.CircleGeometry(30", "build(g,B,tk,venuePhoto){const fl=mesh(g,new THREE.CircleGeometry(30"),
    # Prototype bug: City Rooftop cloned the *material* and called texture methods on it, so the venue threw
    # while building. The window texture is what the emissiveMap wants.
    ('wt=tm(T(winTex(),[1,1],256));', 'wt=T(winTex(),[1,1],256);'),
    ('const arch=(x,w,h)=>', 'const arch=(x:number,w:number,h:number)=>'),
    ('const bal=(x1,z1,x2,z2)=>', 'const bal=(x1:number,z1:number,x2:number,z2:number)=>'),
    ('const hedge=(x1,z1,x2,z2)=>', 'const hedge=(x1:number,z1:number,x2:number,z2:number)=>'),
    ('const ring=cyl(gz,3,3,.22', 'cyl(gz,3,3,.22'),
    ('const chand=z=>', 'const chand=(z:number)=>'),
    ('const gm=(geo,x,y,z)=>', 'const gm=(geo:THREE.BufferGeometry,x:number,y:number,z:number)=>'),
    ('{const r=box(g,.06,.06,20', '{box(g,.06,.06,20'),
    ('const rr=box(fh,13,.4,8', 'box(fh,13,.4,8'),
    ('const th=(x,z)=>1.1', 'const th=(x:number,z:number)=>1.1'),
    ('const th=(x,z)=>3+', 'const th=(x:number,z:number)=>3+'),
    ('const tent=mesh(g,tg', 'mesh(g,tg'),
    ('const rugs=[', 'const rugs: Array<[string[],number,number,number,number,number]>=['),
    ('const a=rnd()*6.28,l=.3+rnd()*.3;', 'const a=rnd()*6.28;rnd();'),  # keep the PRNG sequence identical
]
for a, b in VFIXES:
    if a not in vsrc:
        sys.exit(f'venue fix not found: {a}')
    vsrc = vsrc.replace(a, b, 1)
vheader = '''/* eslint-disable */
// GENERATED by scripts/port-prototype.py from the prototype's SCENES array. Do not hand-edit; change the script.
import * as THREE from 'three';
import { M, box, cyl, ground, jit, mesh, pick, rnd } from '../three/utils';
import { T, tm, planks, tiles, noise, bricks, kilim, winTex } from '../three/textures';
import { flame, flick, plight } from '../three/builder';
import { noSh } from '../three/utils';
import { woodM } from './materials';
import { stars } from './stars';
import type { VenueDef } from '../types';

'''
OUT['src/engine/venues.gen.ts'] = vheader + vsrc + '\n'

for path, text in OUT.items():
    (root / path).write_text(text)
    subprocess.run(['npx', '--yes', 'prettier@3', '--single-quote', '--print-width', '140', '--write', path], cwd=root, check=True, capture_output=True)
print('ok', {k: len(v) for k, v in OUT.items()})

# Second pass, after Prettier: prefix parameters TypeScript reports as unused with `_`.
out = subprocess.run(['npx', 'tsc', '-b'], cwd=root, capture_output=True, text=True).stdout
for path in OUT:
    gen = root / path
    lines = gen.read_text().split('\n')
    hits = re.findall(re.escape(path) + r"\((\d+),(\d+)\): error TS6133: '(\w+)' is declared but its value is never read", out)

    # Only parameters are exempted by a leading underscore; unused locals are reported for hand review.
    def is_param(ln, col):
        before = lines[ln - 1][:col - 1].rstrip()
        return before.endswith('(') or before.endswith(',') and '=>' in lines[ln - 1][col - 1:] or bool(re.search(r"(build|h)\s*\([^)]*$", before))

    for a, b, c in hits:
        if not is_param(int(a), int(b)):
            print(f'{path}: unused local {c} at {a}:{b}: {lines[int(a) - 1].strip()[:120]}')
    hits = [(int(a), int(b), c) for a, b, c in hits if is_param(int(a), int(b))]
    # Edit right-to-left so earlier columns on the same line stay valid.
    for ln, col, name in sorted(hits, reverse=True):
        line = lines[ln - 1]
        i = col - 1
        if line[i:i + len(name)] != name:
            sys.exit(f'unexpected text at {path}:{ln}:{col} for {name}')
        lines[ln - 1] = line[:i] + '_' + line[i:]
    gen.write_text('\n'.join(lines))
    print(path, 'prefixed', len(hits), 'unused parameters')
