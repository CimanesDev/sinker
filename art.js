/* The app's gear art (components/art/gear-art.tsx), ported to plain SVG for the website's shop. */
(() => {
  const ROD = 'M178 46 Q 226 6 262 18';
  const rodPath = (stroke, w, extra = '') => `<path d="${ROD}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linecap="round" ${extra}/>`;
  const RODS = {
    bamboo: rodPath('#C9A15A', 3.2) + [[196, 32], [216, 21], [236, 15], [252, 15]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#8A6A2E"/>`).join(''),
    spinner: rodPath('#4A7A3A', 2.8) + '<circle cx="214" cy="22" r="1.6" fill="none" stroke="#C7CED6" stroke-width="1.1"/><circle cx="186" cy="41" r="5" fill="#2E7D9A"/><path d="M186 41 l5 -3" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>',
    fiber: rodPath('#EFE3C2', 3) + '<circle cx="214" cy="22" r="1.8" fill="none" stroke="#D9452B" stroke-width="1.2"/><circle cx="186" cy="41" r="5" fill="#D9452B"/><circle cx="186" cy="41" r="1.8" fill="#fff"/><circle cx="262" cy="18" r="2" fill="#D9452B"/>',
    carbon: rodPath('#1E232B', 3.2) + '<circle cx="214" cy="22" r="2" fill="none" stroke="#C7CED6" stroke-width="1.3"/><circle cx="240" cy="15" r="1.8" fill="none" stroke="#C7CED6" stroke-width="1.3"/><circle cx="186" cy="41" r="6" fill="#C7CED6" stroke="#5A6476" stroke-width="1.5"/><path d="M186 41 l7 4" stroke="#5A6476" stroke-width="2" stroke-linecap="round"/>',
    titan: rodPath('#8C98A6', 3.4) + rodPath('#DDE6EA', 1) + '<circle cx="214" cy="22" r="2" fill="none" stroke="#3A4A55" stroke-width="1.3"/><circle cx="240" cy="15" r="1.8" fill="none" stroke="#3A4A55" stroke-width="1.3"/><circle cx="186" cy="41" r="7" fill="#3A4A55" stroke="#DDE6EA" stroke-width="1.5"/><circle cx="186" cy="41" r="2.4" fill="#E25A35"/>',
    trench: rodPath('#1D3B6B', 4) + '<path d="M200 30 l3 3 M222 19 l2 3 M244 15 l1 3" stroke="#F6C34A" stroke-width="2"/><circle cx="186" cy="41" r="8" fill="#F6C34A" stroke="#B8860B" stroke-width="1.5"/><circle cx="186" cy="41" r="3" fill="#1D3B6B"/><circle cx="262" cy="18" r="2.6" fill="#F6C34A"/>',
    coral: rodPath('#FF7A8A', 3.6) + '<path d="M200 30 l3 3 M222 19 l2 3 M244 15 l1 3" stroke="#FFF1E0" stroke-width="2"/><circle cx="186" cy="41" r="8" fill="#FFF1E0" stroke="#FF7A8A" stroke-width="2"/><circle cx="186" cy="41" r="3" fill="#FF7A8A"/><circle cx="262" cy="18" r="2.6" fill="#FFF1E0"/>',
    aurora: rodPath('#8FF5E1', 6, 'opacity="0.25"') + rodPath('#3BC9B5', 3.2) + '<path d="M204 27 l3 3 M226 18 l2 3 M246 15 l1 3" stroke="#B794F6" stroke-width="2"/><circle cx="186" cy="41" r="7" fill="#7C5CE0" stroke="#8FF5E1" stroke-width="1.5"/><circle cx="186" cy="41" r="2.5" fill="#8FF5E1"/><circle cx="262" cy="18" r="2.6" fill="#8FF5E1"/>',
  };
  const FISHER = '<rect x="150" y="44" width="22" height="30" rx="8" fill="#F2B33D"/><circle cx="161" cy="36" r="9" fill="#E9B48A"/><path d="M148 33 Q161 18 174 33 Z" fill="#2F5D4E"/><rect x="146" y="31" width="30" height="4" rx="2" fill="#2F5D4E"/><path d="M170 52 L180 46" stroke="#E9B48A" stroke-width="5" stroke-linecap="round"/>';
  const BACK = {
    bangka: '<path d="M120 74 L104 92 M232 74 L248 92" stroke="#C9A15A" stroke-width="3"/>',
    sailboat: '<path d="M120 72 V2" stroke="#8A6A4A" stroke-width="3"/><path d="M117 6 L117 66 L80 66 Z" fill="#F7FBFC"/><path d="M117 30 L117 40 L96 40 Z" fill="#2F7FC1" opacity="0.85"/><path d="M123 12 L123 62 L142 62 Z" fill="#E7EEF1"/><path d="M120 3 L132 7 L120 11 Z" fill="#E25A35"/>',
    trawler: '<path d="M108 36 V2" stroke="#3A4A55" stroke-width="3"/><path d="M108 8 L84 36 M108 8 L134 36" stroke="#3A4A55" stroke-width="1.2"/><path d="M84 22 H132" stroke="#3A4A55" stroke-width="1.6"/><rect x="94" y="36" width="48" height="36" rx="4" fill="#F7FBFC"/><rect x="101" y="44" width="12" height="10" rx="2" fill="#5EC8E5"/><rect x="121" y="44" width="12" height="10" rx="2" fill="#5EC8E5"/><rect x="90" y="32" width="56" height="6" rx="2" fill="#2F5D4E"/>',
    tugboat: '<rect x="110" y="14" width="10" height="22" fill="#2A2F36"/><rect x="110" y="14" width="10" height="6" fill="#E25A35"/><rect x="92" y="34" width="52" height="38" rx="5" fill="#F2E3C4"/><rect x="98" y="42" width="12" height="10" rx="2" fill="#5EC8E5"/><rect x="116" y="42" width="12" height="10" rx="2" fill="#5EC8E5"/><rect x="88" y="30" width="60" height="6" rx="2" fill="#B23A24"/>',
    research: '<path d="M84 72 L90 28 L104 28 L100 72" stroke="#E25A35" stroke-width="4" fill="none" stroke-linejoin="round"/><path d="M90 28 L70 46" stroke="#E25A35" stroke-width="3"/><path d="M70 46 v14" stroke="#7E95A3" stroke-width="1.2"/><rect x="104" y="30" width="44" height="42" rx="5" fill="#DDE6EA"/><rect x="110" y="38" width="32" height="10" rx="3" fill="#12407A"/><path d="M130 30 V14" stroke="#7E95A3" stroke-width="2"/><path d="M120 15 Q130 2 140 15Z" fill="#F7FBFC" stroke="#7E95A3" stroke-width="1.5"/>',
    yacht: '<path d="M112 70 V16" stroke="#C9A15A" stroke-width="2.5"/><path d="M112 18 L90 24 L112 30 Z" fill="#E25A35"/><path d="M92 70 L100 54 L142 54 L148 70 Z" fill="#F7FBFC"/><rect x="104" y="58" width="10" height="7" rx="2" fill="#5EC8E5"/><rect x="120" y="58" width="10" height="7" rx="2" fill="#5EC8E5"/><path d="M100 54 L142 54" stroke="#F2B632" stroke-width="2"/>',
  };
  const FRONT = {
    row: '<path d="M104 72 L248 72 Q240 98 214 100 L136 100 Q112 98 104 72 Z" fill="#C8553D"/><path d="M104 72 L248 72 L245 80 L107 80 Z" fill="#F7FBFC"/><rect x="196" y="58" width="26" height="14" rx="3" fill="#8A5A3B"/>',
    canoe: '<path d="M96 74 Q 176 66 258 74 Q 250 94 216 97 L138 97 Q 104 94 96 74 Z" fill="#9A6A43"/><path d="M96 74 Q 176 66 258 74 L256 79 Q 176 71 98 79 Z" fill="#C89463"/><path d="M120 84 L236 84" stroke="#7A5032" stroke-width="1.5"/><path d="M200 66 L232 92" stroke="#6B4A2E" stroke-width="3" stroke-linecap="round"/><path d="M228 88 q6 2 8 8 q-7 0 -10 -4 z" fill="#6B4A2E"/>',
    bangka: '<path d="M92 72 L262 72 Q256 90 232 96 L124 96 Q100 92 92 72Z" fill="#2F7FC1"/><path d="M92 72 L262 72 L259 78 L95 78Z" fill="#F6C34A"/><path d="M98 83 L255 83 L252 87 L101 87Z" fill="#D9452B"/><path d="M262 72 Q272 60 282 58" stroke="#2F7FC1" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M92 72 Q82 62 74 62" stroke="#2F7FC1" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M64 96 L290 96" stroke="#C9A15A" stroke-width="4.5" stroke-linecap="round"/>',
    sailboat: '<path d="M78 70 L264 70 Q254 98 222 100 L118 100 Q88 96 78 70Z" fill="#F7FBFC"/><path d="M82 80 L260 80 L257 86 L85 86Z" fill="#2F7FC1"/><path d="M78 70 L264 70" stroke="#B9CBD2" stroke-width="2"/>',
    trawler: '<path d="M84 70 L268 70 Q258 102 226 104 L122 104 Q94 100 84 70Z" fill="#2F5D4E"/><path d="M84 70 L268 70 L265 77 L87 77Z" fill="#F7FBFC"/><circle cx="230" cy="88" r="5" fill="#F6C34A" stroke="#F7FBFC" stroke-width="1.5"/>',
    tugboat: '<path d="M80 68 L270 68 Q262 102 228 104 L118 104 Q88 100 80 68Z" fill="#C8412B"/><path d="M80 68 L270 68 L267 75 L83 75Z" fill="#2A2F36"/><circle cx="112" cy="86" r="7" fill="none" stroke="#2A2F36" stroke-width="4"/><circle cx="240" cy="86" r="7" fill="none" stroke="#2A2F36" stroke-width="4"/>',
    research: '<path d="M80 70 L272 70 Q262 104 228 106 L118 106 Q90 102 80 70Z" fill="#F7FBFC"/><path d="M83 80 L268 80 L265 88 L86 88Z" fill="#E25A35"/><path d="M80 70 L272 70" stroke="#B9CBD2" stroke-width="2"/>',
    yacht: '<path d="M76 70 L276 70 Q268 98 232 102 L120 102 Q86 98 76 70Z" fill="#F7FBFC"/><path d="M76 70 L276 70 L273 76 L79 76Z" fill="#F2B632"/><path d="M88 88 L262 88" stroke="#F2B632" stroke-width="2.5" stroke-linecap="round"/><path d="M76 70 Q 64 62 56 56" stroke="#C9A15A" stroke-width="2" fill="none" stroke-linecap="round"/>',
  };
  const BAIT = {
    worm: '<path d="M-1 15 q6 2 1 6 q-5 3 1 6 q4 2 1 5" stroke="#D98A7A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    shrimp: '<path d="M-1 16 q9 0 8 8 q-1 6 -8 5 q4 -2 3 -5 q-1 -4 -6 -3z" fill="#F59B6B"/><path d="M6 17 q5 -4 8 -3 M6 18 q5 -1 7 1" stroke="#F59B6B" stroke-width="0.8" fill="none"/>',
    squid: '<path d="M-4 15 h7 l1 9 l-4.5 4 l-4.5 -4z" fill="#F2C2C2"/><path d="M-3 28 l-1 4 M-0.5 28 v5 M2 28 l1 4" stroke="#F2C2C2" stroke-width="1.1" stroke-linecap="round"/>',
    spoon: '<path d="M0 15 q6 4 4 11 q-2 6 -4 6 q-2 0 -4 -6 q-2 -7 4 -11z" fill="#C7D3DC" stroke="#8C98A6" stroke-width="0.8"/><path d="M-1 19 q2 4 1 9" stroke="#FFFFFF" stroke-width="1" opacity="0.8" fill="none"/>',
    glow: '<circle cx="0" cy="22" r="9" fill="#8FF5E1" opacity="0.25"/><path d="M-1 15 q7 3 2 7 q-5 3 0 7" stroke="#8FF5E1" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
    golden: '<circle cx="0" cy="23" r="9" fill="#F6C34A" opacity="0.22"/><path d="M-5 18 q5 -4 10 0 q-1 6 -5 11 q-4 -5 -5 -11z" fill="#F2B632" stroke="#B8860B" stroke-width="0.8"/><circle cx="-1.5" cy="20" r="1.2" fill="#3B2600"/>',
  };
  window.SINKER_ART = {
    boat: (id, rod = 'bamboo') => `<svg viewBox="60 0 236 110" aria-hidden="true">${BACK[id] || ''}${RODS[rod] || RODS.bamboo}${FISHER}${FRONT[id] || FRONT.row}</svg>`,
    rod: (id) => `<svg viewBox="172 4 96 48" aria-hidden="true">${RODS[id] || RODS.bamboo}</svg>`,
    bait: (id) => `<svg viewBox="-10 10 24 24" aria-hidden="true">${BAIT[id] || ''}</svg>`,
  };
})();
