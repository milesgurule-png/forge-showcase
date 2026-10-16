// Forge Labs Science Lab v3: realistic procedural scientists.
// Same rig contract as v2 (root/hips/spine/neck/head, legL/legR {thigh,knee,ankle}, armL/armR {sh,el,hand}),
// plus coat skirt, lips, fingers and ankles for richer animation.

const IRIS = { 'director':'#4a2f1b', 'historian':'#3d6b4f', 'tech-scout':'#3b2414', 'model-lab':'#2a1a10', 'ai-lab':'#3a2a1a',
               'venture':'#2b1a10', 'physicist':'#4f6d8a', 'quant':'#5a4030', 'psychologist':'#4a3020' };
const HAIR_STYLE = { 'quant':'side', 'physicist':'side', 'venture':'curly' };



export function makePerson(k, a, L) {
  const { THREE, scene, add, mat, CSS2DObject } = k;
  const capsule = (r, len, m, parent, y, segs = 10) => add(new THREE.CapsuleGeometry(r, len, 4, segs), m, 0, y, 0, parent);
  const taper = (rt, rb, h, m, parent, y, segs = 14) => add(new THREE.CylinderGeometry(rt, rb, h, segs), m, 0, y, 0, parent);

  const skin = new THREE.MeshPhysicalMaterial({ color: L.skin, roughness: .55, sheen: .35, sheenColor: new THREE.Color('#ffc9b0'), clearcoat: .05 });
  const hair = mat(L.hair, { roughness: .75 });
  const coat = new THREE.MeshStandardMaterial({ color: L.coat || '#f5f7fa', roughness: L.coat ? .55 : .78, side: THREE.DoubleSide });
  const shirt = mat(L.shirt || new THREE.Color(a.color).lerp(new THREE.Color('#ffffff'), .35), { roughness: .7 });
  const tie = mat(new THREE.Color(a.color).multiplyScalar(.6), { roughness: .5 });
  const pants = mat(L.pants, { roughness: .8 });
  const shoe = mat('#18181b', { roughness: .35, metalness: .1 });
  const lipM = mat(new THREE.Color(L.skin).multiplyScalar(.72).lerp(new THREE.Color('#9e4a4a'), .35), { roughness: .5 });

  const root = new THREE.Group(); root.scale.set(L.w, L.h, L.w); scene.add(root);
  const hips = new THREE.Group(); hips.position.y = .92; root.add(hips);
  add(new THREE.SphereGeometry(.15, 16, 12), pants, 0, -.01, 0, hips).scale.set(1.18, .78, .82);   // pelvis
  taper(.155, .15, .1, mat('#26272b'), hips, .05);                                                  // belt

  // ---- legs: tapered thigh, knee, tapered shin, ankle with shaped shoe
  const leg = (x) => {
    const thigh = new THREE.Group(); thigh.position.set(x, -.03, 0); hips.add(thigh);
    taper(.082, .062, .42, pants, thigh, -.22);
    const knee = new THREE.Group(); knee.position.y = -.45; thigh.add(knee);
    add(new THREE.SphereGeometry(.062, 12, 10), pants, 0, 0, 0, knee);
    taper(.06, .045, .4, pants, knee, -.2);
    const ankle = new THREE.Group(); ankle.position.y = -.41; knee.add(ankle);
    const toe = capsule(.045, .15, shoe, ankle, -.025); toe.rotation.x = Math.PI / 2; toe.position.z = .055; toe.scale.set(1.15, 1, .85);
    add(new THREE.BoxGeometry(.1, .018, .27), mat('#3a3a3d'), 0, -.06, .05, ankle);                 // sole
    return { thigh, knee, ankle };
  };
  const legL = leg(-.095), legR = leg(.095);

  // ---- torso: shaped shirt body, open lab coat with lapels, swinging skirt on the hips
  const spine = new THREE.Group(); spine.position.y = .06; hips.add(spine);
  const bodyProf = [[.0, -.02], [.15, -.02], [.165, .08], [.16, .2], [.18, .34], [.19, .42], [.16, .49], [.07, .53], [0, .54]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(bodyProf, 20), shirt, 0, 0, 0, spine).scale.set(1.15, 1, .78);
  add(new THREE.BoxGeometry(.045, .3, .012), tie, 0, .3, .145, spine);                               // tie
  add(new THREE.ConeGeometry(.028, .05, 4), tie, 0, .135, .147, spine).rotation.x = Math.PI;         // tie tip
  const gap = .5; // front opening (radians)
  const coatProf = [[.205, .0], [.2, .12], [.205, .26], [.215, .38], [.21, .45], [.17, .51], [.08, .55]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(coatProf, 22, gap / 2, Math.PI * 2 - gap), coat, 0, 0, 0, spine).scale.set(1.18, 1, .82);
  for (const s of [-1, 1]) {                                                                          // lapels
    const lap = add(new THREE.BoxGeometry(.06, .22, .012), coat, s * .07, .4, .165, spine); lap.rotation.set(-.15, s * .35, s * .32);
  }
  add(new THREE.BoxGeometry(.08, .055, .008), mat(a.color, { emissive: a.color, emissiveIntensity: .2 }), .12, .36, .17, spine).rotation.y = -.25; // badge
  add(new THREE.BoxGeometry(.012, .09, .012), mat('#2b3140'), -.11, .35, .17, spine);                // pen
  const skirt = new THREE.Group(); skirt.position.y = .05; hips.add(skirt);                           // coat below the waist
  const skirtProf = [[.205, .0], [.215, -.12], [.235, -.28], [.26, -.44], [.265, -.47]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(skirtProf, 22, gap * .7, Math.PI * 2 - gap * 1.4), coat, 0, 0, 0, skirt).scale.set(1.15, 1, .85);

  // ---- head
  const neck = new THREE.Group(); neck.position.y = .55; spine.add(neck);
  taper(.048, .056, .11, skin, neck, 0);
  const head = new THREE.Group(); head.position.y = .15; neck.add(head);
  add(new THREE.SphereGeometry(.112, 28, 20), skin, 0, .01, 0, head).scale.set(.93, 1.1, 1.02);       // cranium
  add(new THREE.SphereGeometry(.075, 18, 14), skin, 0, -.06, .03, head).scale.set(1.05, .85, 1.0);   // jaw/cheeks
  for (const s of [-1, 1]) { const e = add(new THREE.SphereGeometry(.024, 10, 8), skin, s * .108, 0, -.005, head); e.scale.set(.5, 1, .8); } // ears
  const eyeWhite = mat('#f6f4ef', { roughness: .15 }), irisM = mat(IRIS[a.id] || '#3a2a1a', { roughness: .2 }), pupilM = mat('#0c0c0c', { roughness: .1 });
  const eyes = [], lids = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(s * .04, .024, .099); head.add(eye);
    add(new THREE.SphereGeometry(.02, 14, 10), eyeWhite, 0, 0, 0, eye);
    add(new THREE.CircleGeometry(.0115, 18), irisM, 0, 0, .0202, eye);
    add(new THREE.CircleGeometry(.0055, 12), pupilM, 0, 0, .0204, eye);
    eyes.push(eye);
    const lid = add(new THREE.SphereGeometry(.0215, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), skin, s * .04, .025, .099, head); lid.scale.y = .05; lids.push(lid);
  }
  const brows = [-1, 1].map(s => { const b = capsule(.0055, .032, hair, head, .055, 6); b.position.set(s * .041, .06, .113); b.rotation.set(0, 0, Math.PI / 2 + s * .12); return b; });
  const nose = capsule(.012, .03, skin, head, -.01, 8); nose.position.z = .12; nose.rotation.x = .35;
  const upperLip = capsule(.0075, .028, lipM, head, -.048, 8); upperLip.position.z = .109; upperLip.rotation.z = Math.PI / 2;
  const lowerLip = capsule(.0085, .026, lipM, head, -.06, 8); lowerLip.position.z = .107; lowerLip.rotation.z = Math.PI / 2;
  lowerLip.userData.baseY = -.06;

  // ---- hair styles
  const hs = HAIR_STYLE[a.id] || L.style;
  const capR = hs === 'afro' ? .148 : .12;
  const cap = add(new THREE.SphereGeometry(capR, 24, 16, 0, Math.PI * 2, 0, Math.PI * (hs === 'afro' ? .64 : .52)), hair, 0, hs === 'afro' ? .035 : .025, -.01, head);
  cap.scale.set(hs === 'afro' ? 1.15 : 1, 1.05, hs === 'afro' ? 1.12 : 1.06); cap.rotation.x = -.42; cap.position.z -= .012;
  if (hs === 'short' || hs === 'side') { const fr = add(new THREE.SphereGeometry(.119, 18, 10, -Math.PI * .4, Math.PI * .8, Math.PI * .22, Math.PI * .12), hair, 0, .03, .004, head); fr.scale.set(1, 1.05, 1.07); }
  if (hs === 'side') { const sw = capsule(.035, .12, hair, head, .1, 8); sw.position.set(-.03, .1, .055); sw.rotation.set(.4, 0, 1.3); }
  if (hs === 'bun') { add(new THREE.SphereGeometry(.058, 14, 10), hair, 0, .085, -.1, head); add(new THREE.TorusGeometry(.03, .008, 6, 14), tie, 0, .07, -.075, head).rotation.x = .6; }
  if (hs === 'long') { const back = capsule(.1, .14, hair, head, -.06, 12); back.position.z = -.055; back.scale.set(1.15, 1, .55); }
  if (hs === 'curly') { for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2, r = .1; add(new THREE.SphereGeometry(.035, 8, 6), hair, Math.cos(t) * r * .95, .07 + Math.sin(i * 1.7) * .02, Math.sin(t) * r - .01, head); } }
  if (L.glasses) {
    const gm = mat('#141414', { metalness: .7, roughness: .25 });
    for (const s of [-1, 1]) { add(new THREE.TorusGeometry(.025, .0035, 6, 20), gm, s * .041, .024, .124, head); const tmp = add(new THREE.BoxGeometry(.004, .004, .11), gm, s * .067, .026, .07, head); tmp.rotation.y = s * .12; }
    add(new THREE.BoxGeometry(.025, .004, .004), gm, 0, .028, .125, head);
  }

  // ---- arms with sleeves, cuffs and hands with fingers
  const arm = (s) => {
    const sh = new THREE.Group(); sh.position.set(s * .245, .45, 0); spine.add(sh);
    add(new THREE.SphereGeometry(.068, 12, 10), coat, 0, 0, 0, sh);                                  // shoulder
    taper(.065, .052, .3, coat, sh, -.16);
    const el = new THREE.Group(); el.position.y = -.31; sh.add(el);
    add(new THREE.SphereGeometry(.053, 10, 8), coat, 0, 0, 0, el);
    taper(.052, .045, .24, coat, el, -.12);
    taper(.047, .047, .03, shirt, el, -.245);                                                        // shirt cuff
    const hand = new THREE.Group(); hand.position.y = -.28; el.add(hand);
    const palm = capsule(.03, .035, skin, hand, -.025, 8); palm.scale.set(1.25, 1, .62);
    const fingers = [];
    for (let i = 0; i < 4; i++) { const f = new THREE.Group(); f.position.set((i - 1.5) * .016 * s, -.06, .004); hand.add(f);
      capsule(.0075, .03 + (i === 1 || i === 2 ? .008 : 0), skin, f, -.02, 6); f.rotation.x = .25; fingers.push(f); }
    const thumb = new THREE.Group(); thumb.position.set(-s * .032, -.03, .015); hand.add(thumb);
    capsule(.009, .025, skin, thumb, -.015, 6); thumb.rotation.set(.3, 0, -s * .6);
    return { sh, el, hand, fingers, thumb };
  };
  const armL = arm(-1), armR = arm(1);

  // props held in hands
  const mug = add(new THREE.CylinderGeometry(.04, .035, .09, 14), mat('#ffffff', { roughness: .3 }), 0, -.07, .045, armR.hand); mug.visible = false;
  const clip = add(new THREE.BoxGeometry(.2, .26, .012), mat('#b08b5a'), .02, -.06, .07, armL.hand); clip.visible = false; clip.rotation.x = -.4;
  add(new THREE.BoxGeometry(.17, .21, .004), mat('#ffffff'), 0, 0, .008, clip);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 1.9, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = .95; hit.userData.agentId = a.id; root.add(hit);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .6, 40), new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: .9, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .02; ring.visible = false; root.add(ring);
  const nameEl = document.createElement('div'); nameEl.className = 'label'; nameEl.innerHTML = `<span class="dot" style="background:${a.color}"></span>${a.name}`;
  const nameObj = new CSS2DObject(nameEl); nameObj.position.y = 2.05; root.add(nameObj);
  const bubEl = document.createElement('div'); bubEl.className = 'bubble'; const bubObj = new CSS2DObject(bubEl); bubObj.position.y = 2.4; root.add(bubObj);

  return { root, hips, spine, neck, head, legL, legR, armL, armR, eyes, pupils: eyes, lids, brows, mouth: lowerLip, upperLip, lowerLip, skirt, mug, clip, hit, ring, bubEl };
}
