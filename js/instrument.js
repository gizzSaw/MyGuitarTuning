/* Инструменты: гитара (6 струн) и бас (4 или 5 струн). На странице всегда два грифа — карточки Fretboard
   (гитара) и Bass, а переключатель Guitar | Bass в карточке Tuning выбирает только, чья головка показана
   (окошки струн, щипок, Repeat, Play all) и каким инструментом звучат фишки Key/Chord, Play scale и Play chord.
   Строй общий, как в группе: сдвиг от стандартного и Drop (tuningShift, isDropped — в main.js) одинаковы
   для обоих инструментов. Здесь же: карточка Bass (4 | 5 струн, Hide/Show), сохранение в localStorage,
   нарисованная головка баса. Подключается после fretboard.js, до neck.js и main.js: при загрузке строит
   окошки струн и оба грифа, а ноты в них пишет main.js (changeTuning в конце файла). */

const INSTRUMENT_STORAGE_KEY = 'myGuitarTuning.instrument'

let instrumentType = 'guitar' // какой инструмент выбран в карточке Tuning: 'guitar' | 'bass'
let bassStringCount = 4       // 4 | 5 — у карточки Bass (и у головки, когда выбран бас)
let isBassCardCollapsed = false

const instrumentTypeBtns = document.querySelectorAll('.instrument__type .segmented__btn') // Guitar | Bass
const bassStringsBtns = document.querySelectorAll('.guitar-neck__strings .segmented__btn') // 4 | 5 strings
const bassToggleBtn = document.querySelector('.guitar-neck__toggle')                       // Hide | Show
const guitarBoard = document.querySelector('.guitar-neck__inner[data-instrument="guitar"]')
const bassBoard = document.querySelector('.guitar-neck__inner[data-instrument="bass"]')
const headstockLeft = document.querySelector('.app__notes_left')
const headstockRight = document.querySelector('.app__notes_right')
const guitarHeadstock = document.querySelector('.app__img_guitar') // фото головки 3+3
const bassHeadstock = document.querySelector('.app__img_bass')     // SVG, рисуем ниже

const isBass = () => instrumentType === 'bass'
const getBassKey = () => `bass${bassStringCount}`
const getSelectedKey = () => (isBass() ? getBassKey() : 'guitar6')

// какой строй у грифа: data-instrument контейнера -> ключ INSTRUMENT_TUNINGS
const fretboardKey = board => (board.dataset.instrument === 'bass' ? getBassKey() : 'guitar6')

/* Открытые струны инструмента в MIDI по номеру струны ([0] — 1-я, самая тонкая) при общем строе:
   стандартный строй + сдвиг tuningShift (−6…+5). В Drop самая толстая струна остаётся на сдвиге, а остальные
   на 2 полутона выше (гитара Drop D: D2 A2 D3 G3 B3 E4, бас Drop D: D1 A1 D2 G2, 5-струнный Drop A: A0 E1 A1 D2 G2).
   Сдвиг один на весь инструмент, поэтому струны всегда идут по возрастанию. */
const getOpenMidis = key => {
    const standard = INSTRUMENT_TUNINGS[key]
    return standard.map((midi, i) => midi + tuningShift + (isDropped && i < standard.length - 1 ? 2 : 0))
}

// окошки струн показанной головки, по номеру струны (1 — самая тонкая)
const getStringBoxes = () => [...document.querySelectorAll('.app__notes-item')]
    .sort((a, b) => a.dataset.string - b.dataset.string)

const loadInstrument = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(INSTRUMENT_STORAGE_KEY))
        if (saved && saved.type === 'bass') instrumentType = 'bass'
        if (saved && [4, 5].includes(saved.strings)) bassStringCount = saved.strings
        if (saved && saved.bassCollapsed === true) isBassCardCollapsed = true
    } catch (error) {
        // localStorage недоступен (приватный режим, файл с диска в некоторых браузерах) — всё по умолчанию
    }
}

const saveInstrument = () => {
    try {
        localStorage.setItem(INSTRUMENT_STORAGE_KEY, JSON.stringify({
            type: instrumentType, strings: bassStringCount, bassCollapsed: isBassCardCollapsed,
        }))
    } catch (error) {
        // не сохранилось — не страшно, при следующем открытии будет по умолчанию
    }
}

/* ---------- нарисованная головка баса ---------- */

// SVG 220 × 262 (как фото гитары), колки — на высоте окошек: шаг 66 (окошко 56 + зазор 10) вокруг середины 131
const HEAD_ROW_STEP = 66
const headRowY = (index, count) => 131 + (index - (count - 1) / 2) * HEAD_ROW_STEP
// левый край головки на высоте y (правый — зеркально: 220 - x)
const headEdgeX = y => 40 + ((Math.min(Math.max(y, 64), 208) - 64) * 12) / 144

/* Колки 2+2 или 3+2 — так же, как окошки: слева толстые струны, справа тонкие, ближе к порожку (внизу)
   более толстая. Струны идут от колков к порожку, у порожка толстая — слева. */
const drawBassHeadstock = (leftStrings, rightStrings, count) => {
    const nutX = string => 92 + ((count - string) * 36) / (count - 1)
    const thickness = string => 1.4 + ((string - 1) * 1.6) / (count - 1)
    const side = (strings, mirror) => strings.map((string, index) => {
        const y = headRowY(index, strings.length)
        const x = value => (mirror ? 220 - value : value)
        const postX = x(headEdgeX(y) + 18)
        return `
            <rect class="headstock__shaft" x="${Math.min(x(30), x(headEdgeX(y) + 2))}" y="${y - 3}" width="${Math.abs(headEdgeX(y) + 2 - 30)}" height="6" rx="2"/>
            <ellipse class="headstock__key" cx="${x(19)}" cy="${y}" rx="17" ry="11"/>
            <line class="headstock__string" x1="${postX}" y1="${y}" x2="${nutX(string)}" y2="262" stroke-width="${thickness(string)}"/>
            <circle class="headstock__post" cx="${postX}" cy="${y}" r="8"/>
            <circle class="headstock__hole" cx="${postX}" cy="${y}" r="3"/>`
    }).join('')
    return `
        <path class="headstock__body" d="M84 262V242C84 230 58 224 52 208L40 64C38 42 52 24 72 22Q110 10 148 22C168 24 182 42 180 64L168 208C162 224 136 230 136 242V262Z"/>
        <path class="headstock__shine" d="M110 16Q91 17 72 22C52 24 38 42 40 64L52 208C58 224 84 230 84 242V262H110Z"/>
        <path class="headstock__logo" transform="translate(98 30)" d="M12 2C6.9 2 3.5 3.7 3.5 7.3c0 4.8 5.1 12 7.2 14.1a1.8 1.8 0 0 0 2.6 0c2.1-2.1 7.2-9.3 7.2-14.1C20.5 3.7 17.1 2 12 2z"/>
        ${side(leftStrings, false)}
        ${side(rightStrings, true)}
        <rect class="headstock__nut" x="84" y="244" width="52" height="6" rx="1"/>`
}

/* Головка выбранного инструмента. Окошки: слева — толстые струны, справа — тонкие; в колонке сверху вниз —
   к более толстой (гитара: 4 5 6 | 3 2 1, бас 4: 3 4 | 2 1, бас 5: 3 4 5 | 2 1). Текст в них пишет main.js. */
const renderHeadstock = () => {
    const count = INSTRUMENT_TUNINGS[getSelectedKey()].length
    const leftCount = Math.ceil(count / 2)
    const leftStrings = Array.from({ length: leftCount }, (_, i) => count - leftCount + 1 + i)
    const rightStrings = Array.from({ length: count - leftCount }, (_, i) => count - leftCount - i)
    const makeBox = string => {
        const box = document.createElement('button')
        box.type = 'button'
        box.className = `app__notes-item app__notes-item_string${string}`
        box.dataset.string = string
        return box
    }
    headstockLeft.replaceChildren(...leftStrings.map(makeBox))
    headstockRight.replaceChildren(...rightStrings.map(makeBox))
    guitarHeadstock.hidden = isBass()
    // у SVG нет свойства .hidden (оно только у HTML-элементов) — меняем сам атрибут
    bassHeadstock.toggleAttribute('hidden', !isBass())
    bassHeadstock.innerHTML = isBass() ? drawBassHeadstock(leftStrings, rightStrings, count) : ''
}

// переключатели в карточках Tuning и Bass и свёрнутость карточки Bass
const renderInstrumentControls = () => {
    instrumentTypeBtns.forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.instrument === instrumentType))
    bassStringsBtns.forEach(btn => btn.setAttribute('aria-pressed', Number(btn.dataset.strings) === bassStringCount))
    bassBoard.hidden = isBassCardCollapsed
    bassToggleBtn.setAttribute('aria-expanded', !isBassCardCollapsed)
    bassToggleBtn.textContent = isBassCardCollapsed ? 'Show' : 'Hide'
}

// Guitar | Bass: другая головка, строй тот же; грифы не перестраиваются. Повтор струны старой головки — стоп
instrumentTypeBtns.forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.instrument === instrumentType) return
    instrumentType = btn.dataset.instrument
    saveInstrument()
    stopPlayback()
    renderInstrumentControls()
    renderHeadstock()
    changeTuning()
}))

// 4 | 5 струн: перестраиваем только гриф баса (и головку, если показан бас)
bassStringsBtns.forEach(btn => btn.addEventListener('click', () => {
    if (Number(btn.dataset.strings) === bassStringCount) return
    bassStringCount = Number(btn.dataset.strings)
    saveInstrument()
    renderInstrumentControls()
    buildFretboard(bassBoard, bassStringCount)
    refreshNeckCells()
    if (isBass()) {
        stopPlayback()
        renderHeadstock()
    }
    changeTuning()
}))

bassToggleBtn.addEventListener('click', () => {
    isBassCardCollapsed = !isBassCardCollapsed
    saveInstrument()
    renderInstrumentControls()
})

loadInstrument()
renderInstrumentControls()
renderHeadstock()
buildFretboard(guitarBoard, INSTRUMENT_TUNINGS.guitar6.length)
buildFretboard(bassBoard, bassStringCount)
