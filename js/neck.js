/* Карточки «Key» и «Chord» и подсветка грифов (гитары и баса) и пианино.
   Порядок скриптов: theory.js → shapes.js → fretboard.js → instrument.js → piano.js → neck.js → main.js → sound.js.
   main.js вызывает highlightNeck() после каждой перерисовки грифов, поэтому этот файл должен быть загружен раньше него.
   Имена констант не должны совпадать с именами в других файлах (у скриптов общая область видимости). */

/* Клетки обоих грифов (их строит fretboard.js): нота, номер струны (1 — самая тонкая), лад из data-* и чей гриф.
   let, а не const: при перестройке грифа баса (4 ↔ 5 струн) их нужно собрать заново — refreshNeckCells(). */
let neckNotes = []
let neckCells = []
let neckFretCount = 0
const refreshNeckCells = () => {
    neckNotes = [...document.querySelectorAll('.guitar-neck .note')]
    neckCells = neckNotes.map(note => ({
        note,
        string: Number(note.dataset.string),
        fret: Number(note.dataset.fret),
        isGuitar: note.closest('.guitar-neck__inner').dataset.instrument === 'guitar',
    }))
    neckFretCount = Math.max(...neckCells.map(cell => cell.fret))
}
refreshNeckCells()

// тональность
const keyRootSelect = document.querySelector('#keyRoot')
const keyTypeSelect = document.querySelector('#keyType') // тип гаммы: ключ из SCALES
const keyNotesLine = document.querySelector('.key__notes')

// аккорд
const chordRootSelect = document.querySelector('#chordRoot')
const chordQualitySelect = document.querySelector('#chordQuality')
const chordKeyTools = document.querySelector('.chord__key-tools') // Triads | 7th и Play all — только при выбранной тональности
const chordSizeBtns = document.querySelectorAll('.chord__size .segmented__btn') // Triads | 7th
let chordSize = 3
const chordKeyTitle = document.querySelector('.chord__key-title')
const chordList = document.querySelector('.chord__list')
const chordNotesLine = document.querySelector('.chord__notes')

// аппликатуры (shapes.js): режим показа на грифе, найденные позиции и выбранная
const chordShapeBar = document.querySelector('.chord__shape-bar')
const chordViewBtns = document.querySelectorAll('.chord__view .segmented__btn') // All notes | Shape
const chordShapeNav = document.querySelector('.chord__shape-nav')
const chordShapeName = document.querySelector('.chord__shape-name')
const chordShapeTab = document.querySelector('.chord__shape-tab')
const chordShapeBtns = document.querySelectorAll('.chord__shape-btn') // ← →
let chordView = 'all'
let chordShapes = []
let shapeIndex = 0
let shapesFor = '' // для какого аккорда и строя посчитаны позиции: при смене — считаем заново с первой

const neckLegend = document.querySelector('.legend')

// кнопки воспроизведения (их обработчики — в sound.js); неактивны, пока нечего играть
const keyPlayButton = document.querySelector('.key__play')
const chordPlayButton = document.querySelector('.chord__play')

// гаммы и типы аккордов в списках берём из theory.js, чтобы не дублировать их в HTML
SCALE_GROUPS.forEach(([groupLabel, types]) => {
    const group = document.createElement('optgroup')
    group.label = groupLabel
    types.forEach(type => {
        const alias = SCALE_ALIASES[type]
        group.append(new Option(alias ? `${SCALE_NAMES[type]} (${alias})` : SCALE_NAMES[type], type))
    })
    keyTypeSelect.append(group)
})
Object.entries(CHORDS).forEach(([quality, chord]) => chordQualitySelect.add(new Option(chord.label, quality)))

// подсказки берём из разметки, чтобы текст был в одном месте
const hintText = element => element.querySelector('.hint').textContent.trim()
const keyHint = hintText(keyNotesLine)
const chordListHint = hintText(chordList)
const chordHint = hintText(chordNotesLine)

const makeElement = (tag, className, text) => {
    const element = document.createElement(tag)
    element.className = className
    if (text !== undefined) element.textContent = text
    return element
}

const makeHint = text => makeElement('span', 'hint', text)

// фишка ноты (кнопка: по нажатию звучит, см. sound.js); у основного тона — красная
const makeChip = (note, isRoot) => {
    const chip = makeElement('button', isRoot ? 'chip chip_root' : 'chip', note)
    chip.type = 'button'
    return chip
}

const setPressed = (buttons, isPressed) => buttons.forEach(btn => btn.setAttribute('aria-pressed', isPressed(btn)))

// ноты тональности под выбором тональности
const renderKeyNotes = (keyRoot, keyPitches, keyNames) => {
    keyNotesLine.replaceChildren(...(keyRoot
        ? keyPitches.map((pitch, i) => makeChip(keyNames[pitch], i === 0))
        : [makeHint(keyHint)]))
}

// аккорды выбранной тональности: кнопки, по клику аккорд показывается на грифе
const renderKeyChords = (keyRoot, keyPitches, keyNames) => {
    chordKeyTools.hidden = !keyRoot
    if (!keyRoot) {
        chordKeyTitle.textContent = 'Chords in key'
        chordList.replaceChildren(makeHint(chordListHint))
        return
    }
    const keyType = keyTypeSelect.value
    const tonic = keyNames[pitchOf(keyRoot)]
    // у пентатоник аккорды родительской тональности (см. getKeyChords) — так и подписываем
    const isPentatonic = keyType !== 'blues' && PARENT_SCALES[keyType]
    chordKeyTitle.textContent = isPentatonic
        ? `Chords in ${tonic} ${SCALE_NAMES[PARENT_SCALES[keyType]]} (parent key)`
        : `Chords in ${tonic} ${SCALE_NAMES[keyType]}`
    chordList.replaceChildren(...getKeyChords(keyRoot, keyType, chordSize).map(chord => {
        const btn = makeElement('button', 'chord__item')
        btn.dataset.root = chord.root // внутреннее название (NOTES), как value в select
        btn.dataset.quality = chord.quality
        btn.setAttribute('aria-pressed',
            chord.root === chordRootSelect.value && chord.quality === chordQualitySelect.value)
        const rootName = spellChord(pitchOf(chord.root), chord.quality, keyNames, keyPitches)[0]
        btn.append(
            makeElement('span', 'chord__numeral', chord.numeral),
            makeElement('span', 'chord__name', rootName + CHORDS[chord.quality].suffix),
        )
        return btn
    }))
}

// ноты аккорда со ступенями: G B D F / R 3 5 ♭7
const renderChordNotes = (chordRoot, chordNames) => {
    if (!chordRoot) {
        chordNotesLine.replaceChildren(makeHint(chordHint))
        return
    }
    const degrees = getChordDegrees(chordQualitySelect.value)
    chordNotesLine.replaceChildren(...chordNames.map((name, i) => {
        const tone = makeElement('span', 'chord__tone')
        tone.append(makeChip(name, i === 0), makeElement('span', 'chord__degree', degrees[i]))
        return tone
    }))
}

// легенда над грифом — зависит от того, что подсвечено
const LEGENDS = {
    key: [['root', 'Root'], ['tone', 'In key'], ['out', 'Other']],
    chord: [['root', 'Chord root'], ['tone', 'Chord tone'], ['out', 'Other']],
    chordInKey: [['root', 'Chord root'], ['tone', 'Chord tone'], ['key', 'In key'], ['out', 'Other']],
    shape: [['root', 'Chord root'], ['tone', 'In shape'], ['dim', 'Chord tone'], ['out', 'Other']],
}

const renderLegend = mode => {
    neckLegend.hidden = !mode
    if (!mode) return
    neckLegend.replaceChildren(...LEGENDS[mode].map(([kind, text]) =>
        makeElement('li', `legend__item legend__item_${kind}`, text)))
}

/* Пересчитать аппликатуры, если сменился аккорд или строй. Аппликатуры — только для гитарного грифа
   (на грифе баса подсвечены все ноты аккорда); гитарный гриф виден всегда, кто бы ни был выбран в Tuning. */
const updateChordShapes = (chordRoot, chordPitches) => {
    const openMidis = getOpenMidis('guitar6')
    const key = chordRoot ? `${chordRoot}|${chordQualitySelect.value}|${openMidis.join()}` : ''
    if (key === shapesFor) return
    shapesFor = key
    shapeIndex = 0
    chordShapes = key ? findChordShapes(openMidis, pitchOf(chordRoot), chordPitches, neckFretCount) : []
}

// панель аппликатур: All notes | Shape и, в режиме Shape, ← название позиции, x32010, 1 / 5 →
const renderShapeBar = chordRoot => {
    chordShapeBar.hidden = !chordRoot
    chordShapeNav.hidden = chordView !== 'shape'
    if (!chordRoot || chordView !== 'shape') return
    const shape = chordShapes[shapeIndex]
    chordShapeName.textContent = shape ? describeShape(shape, getOpenMidis('guitar6')) : `No playable shape up to fret ${neckFretCount}`
    chordShapeTab.textContent = shape ? `${shapeToString(shape)} · ${shapeIndex + 1} / ${chordShapes.length}` : ''
    chordShapeBtns.forEach(btn => { btn.disabled = chordShapes.length < 2 })
}

/* Выбранная аппликатура для звука (sound.js): ноты от баса вверх — MIDI и клетка гитарного грифа для вспышки.
   null — аккорд не выбран или позиций нет. Звучит выбранная позиция и в режиме All notes. */
const getShapeVoicing = () => {
    const shape = chordRootSelect.value ? chordShapes[shapeIndex] : null
    if (!shape) return null
    const openMidis = getOpenMidis('guitar6')
    return shape.frets
        .map((fret, i) => (fret === null ? null : {
            midi: openMidis[i] + fret,
            note: neckCells.find(cell => cell.isGuitar && cell.string === i + 1 && cell.fret === fret).note,
        }))
        .filter(Boolean)
        .sort((a, b) => a.midi - b.midi)
}

/* Подсветка грифа и пианино, подписи нот.
   Выбран аккорд — заливаем его ноты (основной тон красный), а ноты тональности, не входящие
   в аккорд, обводим контуром. Аккорд не выбран — заливаем ноты тональности. Остальное серое.
   Сравниваем высоты (0–11), а не названия: на грифе может быть написано и B♭, и A♯.
   Названия: без тональности — как раньше, с диезами (NOTES); с тональностью — по её правилам
   (getKeyNames), а ноты выбранного аккорда — как в аккорде (D F♯ A в F major).
   Режим Shape (только гитарный гриф): залиты только ноты выбранной аппликатуры, остальные ноты аккорда приглушены (note_dim),
   на ладу 0 у открытой играющей струны кольцо (note_open), у неиграющей — × (note_muted). */
const highlightNeck = () => {
    const keyRoot = keyRootSelect.value     // '' — тональность не выбрана
    const chordRoot = chordRootSelect.value // '' — аккорд не выбран
    const quality = chordQualitySelect.value
    const keyPitches = keyRoot ? SCALES[keyTypeSelect.value].map(interval => (pitchOf(keyRoot) + interval) % 12) : []
    const chordPitches = chordRoot ? CHORDS[quality].intervals.map(interval => (pitchOf(chordRoot) + interval) % 12) : []

    const keyNames = keyRoot ? getKeyNames(keyRoot, keyTypeSelect.value) : NOTES.slice()
    const chordNames = !chordRoot ? []
        : keyRoot ? spellChord(pitchOf(chordRoot), quality, keyNames, keyPitches)
        : chordPitches.map(pitch => NOTES[pitch])
    const noteNames = keyNames.slice()
    chordPitches.forEach((pitch, i) => { noteNames[pitch] = chordNames[i] })

    updateChordShapes(chordRoot, chordPitches)
    const shape = chordRoot && chordView === 'shape' ? chordShapes[shapeIndex] : null

    const mainRoot = chordRoot ? pitchOf(chordRoot) : keyRoot ? pitchOf(keyRoot) : -1 // -1 — ничего не выбрано
    const mainPitches = chordRoot ? chordPitches : keyPitches
    const contextPitches = chordRoot ? keyPitches : []

    neckCells.forEach(({ note, string, fret, isGuitar }) => {
        const pitch = pitchOf(note.textContent)
        note.textContent = noteNames[pitch]
        // аппликатура — только на гитарном грифе; в её режиме контур тональности не рисуем
        const cellShape = isGuitar ? shape : null
        const cellContext = cellShape ? [] : contextPitches
        const isChordTone = mainPitches.includes(pitch)
        const shapeFret = cellShape ? cellShape.frets[string - 1] : undefined
        const isMain = cellShape ? shapeFret === fret : isChordTone
        const isContext = !isMain && cellContext.includes(pitch)
        const isDim = Boolean(cellShape) && !isMain && isChordTone
        const isMuted = Boolean(cellShape) && fret === 0 && shapeFret === null
        note.classList.toggle('note_root', isMain && pitch === mainRoot)
        note.classList.toggle('note_tone', isMain && pitch !== mainRoot)
        note.classList.toggle('note_key', isContext)
        note.classList.toggle('note_dim', isDim && !isMuted)
        note.classList.toggle('note_out', mainRoot !== -1 && !isMain && !isContext && !isDim && !isMuted)
        note.classList.toggle('note_open', Boolean(cellShape) && fret === 0 && shapeFret === 0)
        note.classList.toggle('note_muted', isMuted)
    })
    highlightPiano(mainRoot, mainPitches, shape ? [] : contextPitches, noteNames) // как гитарный гриф и легенда

    renderKeyNotes(keyRoot, keyPitches, keyNames)
    renderKeyChords(keyRoot, keyPitches, keyNames)
    renderChordNotes(chordRoot, chordNames)
    renderShapeBar(chordRoot)
    renderLegend(shape ? 'shape' : chordRoot ? (keyRoot ? 'chordInKey' : 'chord') : (keyRoot ? 'key' : ''))
    keyPlayButton.disabled = !keyRoot
    chordPlayButton.disabled = !chordRoot
}

keyRootSelect.addEventListener('change', highlightNeck)
keyTypeSelect.addEventListener('change', highlightNeck)
chordRootSelect.addEventListener('change', highlightNeck)
chordQualitySelect.addEventListener('change', highlightNeck)

chordSizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        chordSize = Number(btn.dataset.size)
        setPressed(chordSizeBtns, other => other === btn)
        highlightNeck()
    })
})

chordViewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        chordView = btn.dataset.view
        setPressed(chordViewBtns, other => other === btn)
        highlightNeck()
    })
})

// ← → по кругу
chordShapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const step = btn.classList.contains('chord__shape-next') ? 1 : -1
        shapeIndex = (shapeIndex + step + chordShapes.length) % chordShapes.length
        highlightNeck()
    })
})

// клик по аккорду тональности выбирает его, повторный клик — выключает
chordList.addEventListener('click', event => {
    const btn = event.target.closest('.chord__item')
    if (!btn) return
    const isActive = btn.getAttribute('aria-pressed') === 'true'
    chordRootSelect.value = isActive ? '' : btn.dataset.root
    if (!isActive) chordQualitySelect.value = btn.dataset.quality
    highlightNeck()
})
