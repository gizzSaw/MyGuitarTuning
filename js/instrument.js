/* Инструмент: гитара (6 струн) или бас (4 или 5 струн). Здесь — какой выбран (с сохранением в localStorage),
   окошки струн на головке грифа, нарисованная головка баса и перестройка грифа под число струн.
   Стандартный строй — INSTRUMENT_TUNINGS в theory.js. Подключается после fretboard.js, до neck.js и main.js:
   при загрузке строит окошки и гриф, а ноты в них пишет main.js (changeTuning в конце файла). */

const INSTRUMENT_STORAGE_KEY = 'myGuitarTuning.instrument'

let instrumentType = 'guitar' // 'guitar' | 'bass'
let bassStringCount = 4       // 4 | 5

const instrumentTypeBtns = document.querySelectorAll('.instrument__type .segmented__btn') // Guitar | Bass
const instrumentStringsGroup = document.querySelector('.instrument__strings')            // 4 | 5 strings — только у баса
const instrumentStringsBtns = instrumentStringsGroup.querySelectorAll('.segmented__btn')
const headstockLeft = document.querySelector('.app__notes_left')
const headstockRight = document.querySelector('.app__notes_right')
const guitarHeadstock = document.querySelector('.app__img_guitar') // фото головки 3+3
const bassHeadstock = document.querySelector('.app__img_bass')     // SVG, рисуем ниже

const isBass = () => instrumentType === 'bass'
const getTuningKey = () => (isBass() ? `bass${bassStringCount}` : 'guitar6')
const getStringCount = () => INSTRUMENT_TUNINGS[getTuningKey()].length

// стандартная высота открытой струны в MIDI; струна 1 — самая тонкая
const getStandardMidi = string => INSTRUMENT_TUNINGS[getTuningKey()][string - 1]

// интервалы стандартного строя от самой толстой струны к самой тонкой: гитара 0 5 10 15 19 24, бас 0 5 10 15 (20)
const getTuningSteps = () => {
    const thickToThin = INSTRUMENT_TUNINGS[getTuningKey()].slice().reverse()
    return thickToThin.map(midi => midi - thickToThin[0])
}

// окошки струн, отсортированные по номеру струны (1 — самая тонкая); их число зависит от инструмента
const getStringBoxes = () => [...document.querySelectorAll('.app__notes-item')]
    .sort((a, b) => a.dataset.string - b.dataset.string)

const loadInstrument = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(INSTRUMENT_STORAGE_KEY))
        if (saved && saved.type === 'bass') instrumentType = 'bass'
        if (saved && [4, 5].includes(saved.strings)) bassStringCount = saved.strings
    } catch (error) {
        // localStorage недоступен (приватный режим, файл с диска в некоторых браузерах) — остаётся гитара
    }
}

const saveInstrument = () => {
    try {
        localStorage.setItem(INSTRUMENT_STORAGE_KEY, JSON.stringify({ type: instrumentType, strings: bassStringCount }))
    } catch (error) {
        // не сохранилось — не страшно, при следующем открытии будет гитара
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

/* Окошки струн: слева — толстые, справа — тонкие; в колонке сверху вниз — к более толстой
   (гитара: 4 5 6 | 3 2 1, бас 4: 3 4 | 2 1, бас 5: 3 4 5 | 2 1). Текст в них пишет main.js. */
const renderHeadstock = () => {
    const count = getStringCount()
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

/* Применить инструмент: переключатели, головка, гриф и строй — стандартный, по самой толстой струне
   (гитара — E, бас 4 — E, бас 5 — B). Ноты в окошки и на гриф пишет main.js (changeTuning). */
const applyInstrument = () => {
    instrumentTypeBtns.forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.instrument === instrumentType))
    instrumentStringsBtns.forEach(btn => btn.setAttribute('aria-pressed', Number(btn.dataset.strings) === bassStringCount))
    instrumentStringsGroup.hidden = !isBass()
    renderHeadstock()
    buildFretboard(getStringCount())
    const thickest = INSTRUMENT_TUNINGS[getTuningKey()].at(-1)
    document.querySelector('#currentTuning').textContent = NOTES[thickest % 12]
}

// переключили инструмент: всё перестроить; neck.js собирает клетки грифа заново, main.js пишет строй
const switchInstrument = () => {
    saveInstrument()
    applyInstrument()
    refreshNeckCells()
    setDropped(false)
}

instrumentTypeBtns.forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.instrument === instrumentType) return
    instrumentType = btn.dataset.instrument
    switchInstrument()
}))

instrumentStringsBtns.forEach(btn => btn.addEventListener('click', () => {
    if (Number(btn.dataset.strings) === bassStringCount) return
    bassStringCount = Number(btn.dataset.strings)
    switchInstrument()
}))

loadInstrument()
applyInstrument()
