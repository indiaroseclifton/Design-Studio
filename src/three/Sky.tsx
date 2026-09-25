import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const VERT = `varying vec3 vp;void main(){vp=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FRAG = `uniform vec3 top,hor,bot,sunDir,sunCol,cloudCol;uniform float cloud,time;varying vec3 vp;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1.,0.)),f.x),mix(h2(i+vec2(0.,1.)),h2(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec3 d=normalize(vp);float h=d.y;
  vec3 c=h>0.?mix(hor,top,pow(clamp(h,0.,1.),.55)):mix(hor,bot,clamp(-h*5.,0.,1.));
  float sd=max(dot(d,normalize(sunDir)),0.);
  c+=sunCol*(pow(sd,8.)*.3+pow(sd,400.)*2.);
  if(h>0.&&cloud>0.){
    vec2 uv=d.xz/(h+.12)*1.3+vec2(time*.004,0.);
    float f=smoothstep(.62-cloud*.4,.95,fbm(uv));
    c=mix(c,cloudCol+sunCol*pow(sd,4.)*.4,f*smoothstep(0.,.2,h)*.85);
  }
  gl_FragColor=vec4(c,1.);
}`;

export interface SkyProps {
  top: string;
  hor: string;
  bot: string;
  sunDir: [number, number, number];
  sunCol: string;
  cloud?: number;
  cloudCol?: string;
  /** sun intensity; the glow is scaled by min(1, sunI / 3) as in the prototype */
  sunI?: number;
}

export function Sky({ top, hor, bot, sunDir, sunCol, cloud = 0.35, cloudCol = '#fff6e6', sunI = 3 }: SkyProps) {
  const uniforms = useMemo(
    () => ({
      top: { value: new THREE.Color(top) },
      hor: { value: new THREE.Color(hor) },
      bot: { value: new THREE.Color(bot) },
      sunDir: { value: new THREE.Vector3(...sunDir) },
      sunCol: { value: new THREE.Color(sunCol) },
      cloudCol: { value: new THREE.Color(cloudCol) },
      cloud: { value: cloud },
      time: { value: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useMemo(() => {
    uniforms.top.value.set(top);
    uniforms.hor.value.set(hor);
    uniforms.bot.value.set(bot);
    uniforms.sunDir.value.set(...sunDir).normalize();
    uniforms.sunCol.value.set(sunCol).multiplyScalar(Math.min(1, sunI / 3));
    uniforms.cloudCol.value.set(cloudCol);
    uniforms.cloud.value = cloud;
  }, [uniforms, top, hor, bot, sunDir, sunCol, cloud, cloudCol, sunI]);

  const ref = useRef<THREE.ShaderMaterial>(null);
  useFrame((state) => {
    uniforms.time.value = state.clock.elapsedTime;
  });

  return (
    <mesh renderOrder={-1}>
      <sphereGeometry args={[490, 32, 16]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}
