(function () {
  const uk = {
    app: 'Шахи', play_ai: 'Грати з комп’ютером', play_friend: 'Грати з другом', profile: 'Профіль', top: 'Рейтинг гравців',
    continue_game: 'Продовжити гру', continue_title: 'Ваші партії', vs_computer: 'Комп’ютер', level: 'Рівень', your_move: 'ваш хід', their_move: 'хід суперника',
    waiting_friend: 'чекає на друга', finished: 'завершена', move_n: 'хід', settings: 'Налаштування', sound: 'Звуки', on: 'Увімк.', off: 'Вимк.', language: 'Мова', theme: 'Дошка',
    th_sand: 'Пісок', th_green: 'Зелена', th_blue: 'Блакитна', th_ua: 'Ексклюзив', choose_level: 'Складність', choose_side: 'Ваш колір', white: 'Білі', black: 'Чорні', random: 'Випадково',
    start: 'Почати гру', back: 'Назад', menu: 'Меню', choose_time: 'Контроль часу', quick: 'Швидка гра', quick_hint: 'час на всю партію кожному', corr: 'Листування', corr_hint: 'на кожен хід',
    min: 'хв', day1: 'день', day2: 'дні', day5: 'днів', create_game: 'Створити партію', join_code: 'Приєднатися за кодом', code: 'Код гри', join: 'Приєднатись', or: 'або',
    invite_title: 'Запросіть друга', invite_text: 'Надішліть другу посилання. Він натисне на нього — і одразу потрапить у партію, нічого вводити не треба.', share: 'Надіслати посилання другу', copy_link: 'Скопіювати посилання', copy_code: 'Копіювати', save: 'Зберегти', link_setup_hint: 'Щоб працювало посилання, вставте сюди посилання на вашу гру з BotFather (вигляд: https://t.me/ІМ’Я_БОТА/play). Це робиться один раз.', link_bad: 'Це не схоже на посилання t.me', invite_msg: '♟ Грай зі мною в шахи! Натисни на посилання — і ти одразу в партії:', joining: 'Приєднуємось до партії…', copied: 'Скопійовано', cancel_game: 'Скасувати партію',
    friend_off: 'Гра з другом ще не підключена. Потрібна безкоштовна база Firebase — див. README.txt (крок 3).',
    you: 'Ви', opponent: 'Суперник', guest: 'Гравець', computer: 'Комп’ютер', thinking: 'Думає…',
    flip: 'Перевернути', undo: 'Відкотити хід', draw: 'Нічия', resign: 'Здатися', new_game: 'Нова гра', rematch: 'Реванш', to_menu: 'У меню', close: 'Закрити', yes: 'Так', no: 'Ні', ok: 'Гаразд',
    confirm_resign: 'Здатися в цій партії?', draw_offered: 'Пропонує нічию', accept: 'Прийняти', decline: 'Відхилити', draw_sent: 'Пропозицію нічиєї надіслано', draw_declined: 'Нічию відхилено', draw_wait: 'Чекаємо відповіді…',
    check: 'Шах!', turn_white: 'Хід білих', turn_black: 'Хід чорних', your_turn: 'Ваш хід', opp_turn: 'Хід суперника',
    r_win: 'Ви перемогли!', r_loss: 'Ви програли', r_draw: 'Нічия', r_white: 'Перемогли білі', r_black: 'Перемогли чорні',
    why_checkmate: 'мат', why_stalemate: 'пат', why_insufficient: 'недостатньо матеріалу', why_fifty: 'правило 50 ходів', why_repetition: 'триразове повторення', why_resign: 'суперник здався', why_resign_me: 'ви здалися', why_timeout: 'час вичерпано', why_agreement: 'за згодою',
    points: 'очок', pts_earned: 'Нараховано', rating: 'Рейтинг', matches: 'Партій', wins: 'Перемог', draws: 'Нічиїх', losses: 'Поразок', scoring: 'Перемога +10 · нічия +5 · поразка 0',
    no_players: 'Поки що нікого немає', loading: 'Завантаження…', error_net: 'Немає зв’язку з сервером', game_not_found: 'Партію не знайдено', game_full: 'У цій партії вже є двоє гравців', own_game: 'Це ваша власна партія',
    promo: 'Оберіть фігуру', moves: 'Ходи', time_left: 'залишилось', lost_time: 'Час вичерпано', expires: 'Час на хід',
    level_1: 'Новачок', level_2: 'Початківець', level_3: 'Учень', level_4: 'Любитель', level_5: 'Клубний гравець', level_6: 'Розрядник', level_7: 'Кандидат', level_8: 'Майстер', level_9: 'Гросмейстер', level_10: 'Суперкомп’ютер',
    draw_ai_no: 'Комп’ютер відхилив нічию', draw_ai_yes: 'Комп’ютер прийняв нічию', saved_hint: 'Партія зберігається автоматично', waiting_status: 'Очікуємо суперника…', opp_joined: 'Суперник приєднався!', your_color_is: 'Ви граєте', rated: 'Підсумок',
  };
  const en = {
    app: 'Chess', play_ai: 'Play the computer', play_friend: 'Play a friend', profile: 'Profile', top: 'Leaderboard',
    continue_game: 'Continue game', continue_title: 'Your games', vs_computer: 'Computer', level: 'Level', your_move: 'your move', their_move: 'their move',
    waiting_friend: 'waiting for a friend', finished: 'finished', move_n: 'move', settings: 'Settings', sound: 'Sounds', on: 'On', off: 'Off', language: 'Language', theme: 'Board',
    th_sand: 'Sand', th_green: 'Green', th_blue: 'Blue', th_ua: 'Exclusive', choose_level: 'Difficulty', choose_side: 'Your colour', white: 'White', black: 'Black', random: 'Random',
    start: 'Start game', back: 'Back', menu: 'Menu', choose_time: 'Time control', quick: 'Rapid', quick_hint: 'time for the whole game, per player', corr: 'Correspondence', corr_hint: 'per move',
    min: 'min', day1: 'day', day2: 'days', day5: 'days', create_game: 'Create game', join_code: 'Join by code', code: 'Game code', join: 'Join', or: 'or',
    invite_title: 'Invite a friend', invite_text: 'Send your friend the link. They tap it and land straight in the game, nothing to type.', share: 'Send link to a friend', copy_link: 'Copy link', copy_code: 'Copy', save: 'Save', link_setup_hint: 'For the link to work, paste the link to your game from BotFather here (like https://t.me/YOUR_BOT/play). One time only.', link_bad: 'This does not look like a t.me link', invite_msg: '♟ Play chess with me! Tap the link and you are in the game right away:', joining: 'Joining the game…', copied: 'Copied', cancel_game: 'Cancel game',
    friend_off: 'Playing a friend is not connected yet. It needs a free Firebase database — see README.txt (step 3).',
    you: 'You', opponent: 'Opponent', guest: 'Player', computer: 'Computer', thinking: 'Thinking…',
    flip: 'Flip board', undo: 'Take back', draw: 'Draw', resign: 'Resign', new_game: 'New game', rematch: 'Rematch', to_menu: 'Menu', close: 'Close', yes: 'Yes', no: 'No', ok: 'OK',
    confirm_resign: 'Resign this game?', draw_offered: 'offers a draw', accept: 'Accept', decline: 'Decline', draw_sent: 'Draw offer sent', draw_declined: 'Draw declined', draw_wait: 'Waiting for a reply…',
    check: 'Check!', turn_white: 'White to move', turn_black: 'Black to move', your_turn: 'Your move', opp_turn: 'Opponent’s move',
    r_win: 'You won!', r_loss: 'You lost', r_draw: 'Draw', r_white: 'White won', r_black: 'Black won',
    why_checkmate: 'checkmate', why_stalemate: 'stalemate', why_insufficient: 'insufficient material', why_fifty: '50-move rule', why_repetition: 'threefold repetition', why_resign: 'opponent resigned', why_resign_me: 'you resigned', why_timeout: 'time ran out', why_agreement: 'by agreement',
    points: 'pts', pts_earned: 'Earned', rating: 'Rating', matches: 'Games', wins: 'Wins', draws: 'Draws', losses: 'Losses', scoring: 'Win +10 · draw +5 · loss 0',
    no_players: 'Nobody here yet', loading: 'Loading…', error_net: 'No connection to the server', game_not_found: 'Game not found', game_full: 'This game already has two players', own_game: 'This is your own game',
    promo: 'Choose a piece', moves: 'Moves', time_left: 'left', lost_time: 'Time is up', expires: 'Time per move',
    level_1: 'Beginner', level_2: 'Novice', level_3: 'Learner', level_4: 'Amateur', level_5: 'Club player', level_6: 'Advanced', level_7: 'Expert', level_8: 'Master', level_9: 'Grandmaster', level_10: 'Supercomputer',
    draw_ai_no: 'The computer declined the draw', draw_ai_yes: 'The computer accepted the draw', saved_hint: 'The game is saved automatically', waiting_status: 'Waiting for opponent…', opp_joined: 'Opponent joined!', your_color_is: 'You play', rated: 'Result',
  };
  const D = { uk, en };
  let lang = 'uk';
  window.I18N = {
    set(l) { lang = D[l] ? l : 'uk'; document.documentElement.lang = lang; },
    get lang() { return lang; },
    t(k, p) { let s = (D[lang][k] != null ? D[lang][k] : D.uk[k]) || k; if (p) for (const x in p) s = s.replace('{' + x + '}', p[x]); return s; },
    days(n) { if (lang === 'en') return n + ' ' + (n === 1 ? 'day' : 'days'); return n + ' ' + (n === 1 ? 'день' : n < 5 ? 'дні' : 'днів'); },
    mins(n) { return n + ' ' + D[lang].min; },
  };
})();
