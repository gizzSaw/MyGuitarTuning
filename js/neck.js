/* Карточки «Key» и «Chord» и подсветка грифа.
   Порядок скриптов: theory.js → neck.js → main.js. main.js вызывает highlightNeck() после каждой
   перерисовки грифа, поэтому этот файл должен быть загружен раньше него.
   Имена констант не должны совпадать с именами в main.js (у скриптов общая область видимости). */

const neckNotes = document.querySelectorAll('.guitar-neck .note')

// тональность
const keyRootSelect = document.querySelector('#keyRoot')
const keyTypeBtns = document.querySelectorAll('.key__types .segmented__btn') // Major | Minor | Blues
let keyType = 'major'
const keyNotesLine = document.querySelector('.key__notes')

// аккорд
const chordRootSelect = document.querySelector('#chordRoot')
const chordQualitySelect = document.querySelector('#chordQuality')
const chordSizeGroup = document.querySelector('.chord__size')
const chordSizeBtns = chordSizeGroup.querySelectorAll('.segmented__btn') // Triads | 7th
let chordSize = 3
const chordKeyTitle = document.querySelector('.chord__key-title')
const chordList = document.querySelector('.chord__list')
const chordNotesLine = document.querySelector('.chord__notes')

const neckLegend = document.querySelector('.legend')

// типы аккордов в списке берём из CHORDS, чтобы не дублировать их в HTML
Object.entries(CHORDS).forEach(([quality, chord]) => chordQualitySelect.add(new Option(chord.label, quality)))

const SCALE_LABELS = { major: 'Major', minor: 'Minor', blues: 'Blues' }

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

// фишка ноты; у основного тона — красная
const makeChip = (note, isRoot) => makeElement('span', isRoot ? 'chip chip_root' : 'chip', note)

const setPressed = (buttons, isPressed) => buttons.forEach(btn => btn.setAttribute('aria-pressed', isPressed(btn)))

// ноты тональности под выбором тональности
const renderKeyNotes = (keyRoot, scaleNotes) => {
    keyNotesLine.replaceChildren(...(keyRoot
        ? scaleNotes.map((note, i) => makeChip(note, i === 0))
        : [makeHint(keyHint)]))
}

// аккорды выбранной тональности: кнопки, по клику аккорд показывается на грифе
const renderKeyChords = keyRoot => {
    chordSizeGroup.hidden = !keyRoot
    if (!keyRoot) {
        chordKeyTitle.textContent = 'Chords in key'
        chordList.replaceChildren(makeHint(chordListHint))
        return
    }
    chordKeyTitle.textContent = `Chords in ${keyRoot} ${SCALE_LABELS[keyType]}`
    chordList.replaceChildren(...getKeyChords(keyRoot, keyType, chordSize).map(chord => {
        const btn = makeElement('button', 'chord__item')
        btn.dataset.root = chord.root
        btn.dataset.quality = chord.quality
        btn.setAttribute('aria-pressed',
            chord.root === chordRootSelect.value && chord.quality === chordQualitySelect.value)
        btn.append(
            makeElement('span', 'chord__numeral', chord.numeral),
            makeElement('span', 'chord__name', getChordName(chord.root, chord.quality)),
        )
        return btn
    }))
}

// ноты аккорда со ступенями: G B D F / R 3 5 ♭7
const renderChordNotes = chordRoot => {
    if (!chordRoot) {
        chordNotesLine.replaceChildren(makeHint(chordHint))
        return
    }
    const quality = chordQualitySelect.value
    const degrees = getChordDegrees(quality)
    chordNotesLine.replaceChildren(...getChordNotes(chordRoot, quality).map((note, i) => {
        const tone = makeElement('span', 'chord__tone')
        tone.append(makeChip(note, i === 0), makeElement('span', 'chord__degree', degrees[i]))
        return tone
    }))
}

// легенда над грифом — зависит от того, что подсвечено
const LEGENDS = {
    key: [['root', 'Root'], ['tone', 'In key'], ['out', 'Other']],
    chord: [['root', 'Chord root'], ['tone', 'Chord tone'], ['out', 'Other']],
    chordInKey: [['root', 'Chord root'], ['tone', 'Chord tone'], ['key', 'In key'], ['out', 'Other']],
}

const renderLegend = mode => {
    neckLegend.hidden = !mode
    if (!mode) return
    neckLegend.replaceChildren(...LEGENDS[mode].map(([kind, text]) =>
        makeElement('li', `legend__item legend__item_${kind}`, text)))
}

/* Подсветка грифа.
   Выбран аккорд — заливаем его ноты (основной тон красный), а ноты тональности, не входящие
   в аккорд, обводим контуром. Аккорд не выбран — заливаем ноты тональности. Остальное серое. */
const highlightNeck = () => {
    const keyRoot = keyRootSelect.value     // '' — тональность не выбрана
    const chordRoot = chordRootSelect.value // '' — аккорд не выбран
    const scaleNotes = keyRoot ? getScaleNotes(keyRoot, keyType) : []
    const chordNotes = chordRoot ? getChordNotes(chordRoot, chordQualitySelect.value) : []

    const mainRoot = chordRoot || keyRoot
    const mainNotes = chordRoot ? chordNotes : scaleNotes
    const contextNotes = chordRoot ? scaleNotes : []

    neckNotes.forEach(note => {
        const name = note.textContent
        const isMain = mainNotes.includes(name)
        const isContext = !isMain && contextNotes.includes(name)
        note.classList.toggle('note_root', name === mainRoot)
        note.classList.toggle('note_tone', isMain && name !== mainRoot)
        note.classList.toggle('note_key', isContext)
        note.classList.toggle('note_out', mainRoot !== '' && !isMain && !isContext)
    })

    renderKeyNotes(keyRoot, scaleNotes)
    renderKeyChords(keyRoot)
    renderChordNotes(chordRoot)
    renderLegend(chordRoot ? (keyRoot ? 'chordInKey' : 'chord') : (keyRoot ? 'key' : ''))
}

keyRootSelect.addEventListener('change', highlightNeck)
chordRootSelect.addEventListener('change', highlightNeck)
chordQualitySelect.addEventListener('change', highlightNeck)

keyTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        keyType = btn.dataset.scale
        setPressed(keyTypeBtns, other => other === btn)
        highlightNeck()
    })
})

chordSizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        chordSize = Number(btn.dataset.size)
        setPressed(chordSizeBtns, other => other === btn)
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
