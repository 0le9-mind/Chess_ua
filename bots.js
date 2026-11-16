/* bots.js - registry of AI characters. To add a new character: call Bots.register({...}) (copy one of the entries below).
   Fields: id, rating (display), level (engine strength 0-10, see engine.js), name/bio {uk,en}, avatar (SVG markup),
   lines: { botAhead, playerAhead, capture, idle, start, win, lose, draw }  each {uk:[...], en:[...]}  (missing = silent). */
(function () {
  'use strict';
  const svg = (id, c1, c2, body) => `<svg viewBox="0 0 100 100" class="botsvg" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#bg-${id})"/>${body}</svg>`;
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#1b1b1f"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;

  /* 1. Білкособака: red spaniel body, squirrel tail and squirrel face, hungry */
  const bilko = svg('bilko', '#fbe3a6', '#f0b45a', `
    <path d="M66 86 C98 84 100 40 82 26 C72 18 62 28 72 40 C80 50 74 66 60 74 Z" fill="#b85a1e"/>
    <path d="M72 80 C92 76 92 46 80 34 C76 32 72 36 76 42 C82 52 78 66 68 72 Z" fill="#e48b3f"/>
    <ellipse cx="46" cy="96" rx="34" ry="24" fill="#a8481a"/>
    <path d="M18 80 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0 q6 -8 12 0" fill="none" stroke="#c9642a" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="44" cy="92" rx="11" ry="13" fill="#f7ead3"/>
    <path d="M30 70 L36 60 L64 60 L70 70 Q50 80 30 70Z" fill="#3a6a9a"/><circle cx="50" cy="77" r="4" fill="#f2c230" stroke="#b8860b" stroke-width="1"/>
    <path d="M30 24 L34 8 L44 22 Z M70 24 L66 8 L56 22 Z" fill="#c4682a"/><path d="M33 10 L30 3 M67 10 L70 3" stroke="#8a3f12" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="50" cy="42" rx="23" ry="20" fill="#dc7a2c"/>
    <ellipse cx="50" cy="52" rx="17" ry="12" fill="#f5c88f"/>
    ${eye(40, 38, 4)}${eye(60, 38, 4)}
    <path d="M34 31 Q40 27 45 31 M55 31 Q60 27 66 31" stroke="#7a3a10" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="47" rx="4" ry="3" fill="#3b1f12"/>
    <path d="M50 50 L50 54" stroke="#3b1f12" stroke-width="1.6"/>
    <rect x="45.5" y="54" width="9" height="9" rx="2" fill="#fff" stroke="#c9b89a" stroke-width="1"/><path d="M50 54 V63" stroke="#c9b89a" stroke-width="1"/>
    <path d="M41 56 Q50 66 59 56" fill="none" stroke="#3b1f12" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M58 60 q3 5 0 8 q-3 -3 0 -8Z" fill="#7cc4ee"/>
    <g transform="rotate(-35 22 80)"><ellipse cx="22" cy="80" rx="9" ry="6" fill="#a4561e" stroke="#6e3510" stroke-width="1.5"/><rect x="29" y="78" width="9" height="4" rx="2" fill="#f4ecd8" stroke="#bbb" stroke-width="1"/><circle cx="39" cy="77" r="2.5" fill="#f4ecd8"/><circle cx="39" cy="83" r="2.5" fill="#f4ecd8"/></g>`);

  /* 2. Песич: dark-grey Caucasian shepherd body, little-owl head */
  const pesych = svg('pesych', '#8fa3c4', '#46557a', `
    <ellipse cx="50" cy="98" rx="46" ry="28" fill="#464a52"/>
    <path d="M14 92 q6 -10 10 -2 M30 96 q6 -10 10 -2 M60 96 q6 -10 10 -2 M76 90 q6 -10 10 -2" stroke="#6a707b" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M22 72 Q50 90 78 72 L80 82 Q50 100 20 82 Z" fill="#26262a"/>
    <g fill="#d9dde3" stroke="#7c828c" stroke-width="1"><path d="M30 80 l3 -7 l3 8z"/><path d="M44 85 l3 -7 l3 8z"/><path d="M58 85 l3 -7 l3 8z"/><path d="M70 80 l3 -7 l3 8z"/></g>
    <ellipse cx="50" cy="42" rx="27" ry="25" fill="#7d6f55"/>
    <path d="M26 24 Q50 14 74 24 L72 30 Q50 22 28 30Z" fill="#5d5240"/>
    <g stroke="#4b4132" stroke-width="2" stroke-linecap="round"><path d="M36 22 v7 M44 20 v8 M56 20 v8 M64 22 v7"/></g>
    <circle cx="38" cy="44" r="13" fill="#e9e1cc"/><circle cx="62" cy="44" r="13" fill="#e9e1cc"/>
    <circle cx="38" cy="44" r="8.5" fill="#f2c230"/><circle cx="62" cy="44" r="8.5" fill="#f2c230"/>
    <circle cx="38" cy="45" r="4.2" fill="#15151a"/><circle cx="62" cy="45" r="4.2" fill="#15151a"/>
    <circle cx="36.6" cy="43.4" r="1.4" fill="#fff"/><circle cx="60.6" cy="43.4" r="1.4" fill="#fff"/>
    <path d="M24 33 L44 40 M76 33 L56 40" stroke="#3b3326" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M30 31 L43 36 M70 31 L57 36" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/>
    <path d="M45 50 L55 50 L50 63 Z" fill="#d79a2a" stroke="#8a5f10" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M44 66 Q50 69 56 66" stroke="#2a2a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`);

  /* 3. Барон Вовк: sports blogger wolf in a black tracksuit */
  const baron = svg('baron', '#c6ec8a', '#5fae3f', `
    <path d="M6 100 C8 76 28 68 50 68 C72 68 92 76 94 100 Z" fill="#1c1c21"/>
    <path d="M22 72 L14 100 M26 71 L20 100 M78 72 L86 100 M74 71 L80 100" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M50 74 V100" stroke="#8c8c96" stroke-width="2.2"/><rect x="48" y="78" width="4" height="6" rx="1" fill="#d4d4dc"/>
    <path d="M30 66 L38 78 L50 72 L62 78 L70 66 L62 60 L38 60 Z" fill="#26262c"/>
    <path d="M28 28 L30 6 L46 22 Z M72 28 L70 6 L54 22 Z" fill="#7f8690"/><path d="M31 24 L32 12 L41 22 Z M69 24 L68 12 L59 22 Z" fill="#e8a3a9"/>
    <path d="M26 46 L18 52 L28 56 L22 64 L36 62 Z M74 46 L82 52 L72 56 L78 64 L64 62 Z" fill="#8c939c"/>
    <ellipse cx="50" cy="44" rx="25" ry="21" fill="#8c939c"/>
    <path d="M32 30 Q50 22 68 30 Q60 38 50 36 Q40 38 32 30Z" fill="#767d86"/>
    <ellipse cx="50" cy="55" rx="14" ry="10" fill="#d3d8de"/>
    <ellipse cx="41" cy="42" rx="6" ry="6.5" fill="#fff"/><ellipse cx="59" cy="42" rx="6" ry="6.5" fill="#fff"/>
    <circle cx="42" cy="43" r="3.4" fill="#17171b"/><circle cx="58" cy="43" r="3.4" fill="#17171b"/><circle cx="43" cy="41.6" r="1.1" fill="#fff"/><circle cx="59" cy="41.6" r="1.1" fill="#fff"/>
    <path d="M33 33 Q41 28 47 33 M53 33 Q59 28 67 33" stroke="#4b5159" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="49.5" rx="5" ry="3.6" fill="#17171b"/>
    <path d="M41 56 Q50 74 59 56 Z" fill="#7a1f2b"/><path d="M45 61 Q50 70 55 61 Z" fill="#e8667a"/>
    <path d="M42 56 L44 60 L46 56 M54 56 L56 60 L58 56" fill="#fff"/>
    <g transform="rotate(14 80 76)"><rect x="72" y="62" width="15" height="26" rx="3" fill="#0f0f12" stroke="#7a7a86" stroke-width="1.5"/><circle cx="79.5" cy="70" r="3.4" fill="#4a90e2"/><circle cx="79.5" cy="70" r="1.4" fill="#0f0f12"/></g>
    <ellipse cx="72" cy="86" rx="8" ry="6.5" fill="#8c939c"/><path d="M66 84 v-3 M70 83 v-3 M74 83 v-3" stroke="#6d747d" stroke-width="2" stroke-linecap="round"/>`);

  /* 4. Бобер Капусняк: beaver chef with a cabbage */
  const kapusnyak = svg('kapusnyak', '#fdf1c7', '#e9c76f', `
    <path d="M8 100 C10 78 30 70 50 70 C70 70 90 78 92 100 Z" fill="#fbfbf9" stroke="#d6d3cb" stroke-width="1.5"/>
    <path d="M50 72 V100" stroke="#d6d3cb" stroke-width="1.5"/>
    <circle cx="40" cy="84" r="2.6" fill="#4a4a50"/><circle cx="40" cy="94" r="2.6" fill="#4a4a50"/><circle cx="60" cy="84" r="2.6" fill="#4a4a50"/><circle cx="60" cy="94" r="2.6" fill="#4a4a50"/>
    <path d="M42 70 L50 80 L58 70 Z" fill="#d6453d"/>
    <circle cx="28" cy="40" r="8" fill="#8a5428"/><circle cx="72" cy="40" r="8" fill="#8a5428"/><circle cx="28" cy="40" r="4" fill="#d9a3a0"/><circle cx="72" cy="40" r="4" fill="#d9a3a0"/>
    <ellipse cx="50" cy="52" rx="24" ry="21" fill="#a2672f"/>
    <ellipse cx="50" cy="60" rx="15" ry="11" fill="#d1a06a"/>
    <circle cx="35" cy="56" r="4.5" fill="#f2a0a0" opacity=".7"/><circle cx="65" cy="56" r="4.5" fill="#f2a0a0" opacity=".7"/>
    ${eye(40, 47, 3.6)}${eye(60, 47, 3.6)}
    <path d="M34 41 Q40 38 45 41 M55 41 Q60 38 66 41" stroke="#5e3a18" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="55" rx="5" ry="3.6" fill="#2a1a10"/>
    <rect x="44.5" y="60" width="11" height="11" rx="2.5" fill="#fff" stroke="#c9b89a" stroke-width="1.2"/><path d="M50 60 V71" stroke="#c9b89a" stroke-width="1.2"/>
    <path d="M40 62 Q50 70 60 62" stroke="#5e3a18" stroke-width="1.8" fill="none" stroke-linecap="round" transform="translate(0 -3)"/>
    <g fill="#fff" stroke="#d4d4d0" stroke-width="1.5"><circle cx="38" cy="22" r="10"/><circle cx="50" cy="16" r="11"/><circle cx="62" cy="22" r="10"/><rect x="35" y="25" width="30" height="12" rx="3"/></g>
    <path d="M35 33 H65" stroke="#d4d4d0" stroke-width="1.5"/>
    <circle cx="78" cy="86" r="13" fill="#86be5e"/><path d="M78 74 C70 80 70 92 78 99 M78 74 C86 80 86 92 78 99 M66 86 C72 82 84 82 90 86" fill="none" stroke="#5f9a3e" stroke-width="2"/>`);

  /* 5. Баобабова Капібара: capybara entrepreneur in a stained butcher's apron */
  const capybara = svg('capybara', '#f6cfa6', '#d38a52', `
    <path d="M6 92 C8 70 12 62 14 50 L26 50 C28 62 32 70 34 92 Z" fill="#7b5a3a"/>
    <g fill="#6fa14b"><ellipse cx="10" cy="46" rx="10" ry="6"/><ellipse cx="26" cy="42" rx="10" ry="6"/><ellipse cx="20" cy="38" rx="9" ry="5"/></g>
    <ellipse cx="50" cy="98" rx="40" ry="26" fill="#8d5c33"/>
    <path d="M30 100 L34 72 L66 72 L70 100 Z" fill="#f3eee6" stroke="#d4cec2" stroke-width="1.5"/>
    <path d="M36 72 L40 60 M64 72 L60 60" stroke="#d4cec2" stroke-width="2.5"/>
    <g fill="#a8272b" opacity=".85"><ellipse cx="45" cy="84" rx="6" ry="3.6"/><ellipse cx="58" cy="92" rx="5" ry="3"/><ellipse cx="40" cy="95" rx="3.4" ry="2.4"/><circle cx="56" cy="80" r="2"/></g>
    <circle cx="32" cy="32" r="6" fill="#8f5f33"/><circle cx="68" cy="32" r="6" fill="#8f5f33"/><circle cx="32" cy="32" r="2.8" fill="#d9a3a0"/><circle cx="68" cy="32" r="2.8" fill="#d9a3a0"/>
    <rect x="27" y="30" width="46" height="38" rx="19" fill="#a26f40"/>
    <ellipse cx="50" cy="58" rx="19" ry="12" fill="#8c5c30"/>
    <ellipse cx="44" cy="55" rx="2.2" ry="3" fill="#2a1a10"/><ellipse cx="56" cy="55" rx="2.2" ry="3" fill="#2a1a10"/>
    ${eye(39, 43, 2.8)}${eye(61, 43, 2.8)}
    <path d="M33 37 L44 40 M67 37 L56 40" stroke="#4f3217" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M44 63 Q50 61 56 63" stroke="#3a2412" stroke-width="2" fill="none" stroke-linecap="round"/>
    <rect x="48" y="63" width="4" height="4" rx="1" fill="#fff" stroke="#c9b89a" stroke-width=".8"/>
    <g fill="#fff" stroke="#d4d4d0" stroke-width="1.5"><rect x="31" y="24" width="38" height="9" rx="4"/><ellipse cx="50" cy="22" rx="17" ry="7"/></g>
    <path d="M70 46 q3 5 0 8 q-3 -3 0 -8Z" fill="#7cc4ee"/>
    <path d="M70 66 L92 80" stroke="#caa56a" stroke-width="2.4" stroke-linecap="round"/>
    <g fill="#8a3b22" stroke="#5e2512" stroke-width="1"><circle cx="76" cy="70" r="4"/><circle cx="82" cy="74" r="4"/><circle cx="88" cy="78" r="4"/></g>
    <ellipse cx="68" cy="68" rx="6" ry="5" fill="#8d5c33"/>`);

  const registry = [];
  const Bots = {
    list: registry,
    register(def) { const i = registry.findIndex((b) => b.id === def.id); if (i >= 0) registry[i] = def; else registry.push(def); return def; },
    get(id) { return registry.find((b) => b.id === id) || null; },
    name(b, lang) { return (b.name[lang] || b.name.uk); },
    bio(b, lang) { return (b.bio[lang] || b.bio.uk); },
    // random line of a kind, or null (never repeats the previous one)
    pick(b, kind, lang) {
      const set = b.lines && b.lines[kind]; const arr = set && (set[lang] || set.uk);
      if (!arr || !arr.length) return null;
      let line = arr[Math.floor(Math.random() * arr.length)];
      if (arr.length > 1 && line === b._last) line = arr[(arr.indexOf(line) + 1) % arr.length];
      b._last = line; return line;
    },
  };

  Bots.register({ id: 'bilkosobaka', rating: 300, level: 0, avatar: bilko,
    name: { uk: 'Білкособака', en: 'Squirrel-Dog' },
    bio: { uk: 'Ненажера, зациклений на їжі. Рудий спанієль із хвостом і мордою білки.', en: 'A glutton obsessed with food. A red spaniel with a squirrel’s tail and face.' },
    lines: {
      botAhead: { uk: ['Які смачні фігурки. Хочу ще.'], en: ['What tasty little pieces. I want more.'] },
      playerAhead: { uk: ['Невже ти мене залишиш без вечері?'], en: ['You wouldn’t leave me without dinner, would you?'] },
    } });
  Bots.register({ id: 'pesych', rating: 500, level: 1, avatar: pesych,
    name: { uk: 'Песич', en: 'Dog-Owl' },
    bio: { uk: 'Ненаситний амбал: спокійний, але погрожує зʼїсти того, хто програв. Тіло кавказької вівчарки, голова сича.', en: 'An insatiable bruiser: calm, yet threatens to eat the loser. A shepherd’s body with an owl’s head.' },
    lines: {
      botAhead: { uk: ['Бачу ти кандидат на те, щоб стати моїм кормом. Сьогодні мене чекає славетний пір!'], en: ['I see you are a candidate to become my feed. A glorious feast awaits me tonight!'] },
      playerAhead: { uk: ['Ех, бачу ти активно борешся за своє існування. Ти диви який!'], en: ['Heh, I see you fight hard for your existence. Look at you!'] },
    } });
  Bots.register({ id: 'baron-vovk', rating: 750, level: 3, avatar: baron,
    name: { uk: 'Барон Вовк', en: 'Baron Wolf' },
    bio: { uk: 'Спортивний блогер, який грає драматично й із захопленням. Чорна олімпійка, сіра шерсть.', en: 'A sports vlogger who plays dramatically and with passion. Black tracksuit, grey fur.' },
    lines: {
      botAhead: { uk: ['Сито, сито. Оце я рачконувся!'], en: ['Full, full. Now that was a real crawl!'] },
      playerAhead: { uk: ['Бачу ти теж рачковатий тіп, як і я. Прошарений!'], en: ['I see you are a crafty type, just like me. Seasoned!'] },
    } });
  Bots.register({ id: 'bober-kapusnyak', rating: 1000, level: 5, avatar: kapusnyak,
    name: { uk: 'Бобер Капусняк', en: 'Beaver Kapusnyak' },
    bio: { uk: 'Шеф-кухар, зациклений на їжі та приготуванні страв. Доброзичливий бобер у білому кухарському вбранні.', en: 'A chef obsessed with food and cooking. A friendly beaver in a white chef’s outfit.' },
    lines: {
      botAhead: { uk: ['Смачна партія, як може бути страва!'], en: ['A tasty game, just like a dish can be!'] },
      playerAhead: { uk: ['Ех, помилки бувають так само, як і в приготуванні їжі. Там недосолиш, тут пересолиш.'], en: ['Eh, mistakes happen just like in cooking. Too little salt here, too much there.'] },
      capture: { uk: ['Який смачний хід!', 'Яка смачна та апетитна фігура!'], en: ['What a tasty move!', 'What a tasty and appetising piece!'] },
      idle: { uk: ['Партія буває шалена, як і страва, просто вона не всім до смаку!'], en: ['A game can be wild, just like a dish; it is just not to everyone’s taste!'] },
    } });
  Bots.register({ id: 'baobab-kapibara', rating: 1500, level: 7, avatar: capybara,
    name: { uk: 'Баобабова Капібара', en: 'Baobab Capybara' },
    bio: { uk: 'Смачний підприємець: шаурма, шашлик, біляші, лаваші. Кухар і бізнесмен в одному, у трохи заляпаному фартуху.', en: 'A tasty entrepreneur: shawarma, kebabs, belyashi, lavash. Cook and businessman in one, in a slightly stained apron.' },
    lines: {
      botAhead: { uk: ['Такі ходи можуть надати непогані прибутки. Залишилось довести справу до кінця.'], en: ['Moves like these can bring decent profits. It only remains to see the deal through.'] },
      playerAhead: { uk: ['Ех, ці ходи нічого путнього мені не дали. Але я зробив хоч якісь спроби.'], en: ['Eh, these moves gave me nothing worthwhile. But at least I made some attempts.'] },
    } });

  window.Bots = Bots;
})();
