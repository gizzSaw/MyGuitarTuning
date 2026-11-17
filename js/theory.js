/* Музыкальная теория: ноты, гаммы, аккорды и аккорды тональности.
   Только данные и чистые функции, с DOM файл не работает.
   Подключается первым: NOTES и остальное отсюда нужны всем остальным скриптам. */

/* Все 12 нот октавы. Это внутренняя модель: нота хранится как индекс в этом массиве (C = 0),
   а названия здесь — с диезами. Как ноту показать в выбранной тональности (B♭ вместо A♯),
   решает getKeyNames. Знаки во всём приложении — ♯ и ♭ (Unicode), не # и b. */
const NOTES = [ 'C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B' ]

// те же ноты с бемолями; это же и названия тоник мажорных тональностей (F, B♭, E♭, A♭, D♭, G♭ — бемольные)
const FLAT_NAMES = [ 'C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B' ]

/* Стандартный строй инструментов: MIDI-номера открытых струн по номеру струны, [0] — 1-я (самая тонкая).
   Отсюда же интервалы строя (от самой толстой струны) и октавы струн при сдвиге строя (nearestMidi).
   Бас звучит на октаву ниже гитары: E1 = 28 (41,20 Гц), B0 = 23 (30,87 Гц). */
const INSTRUMENT_TUNINGS = {
    guitar6: [64, 59, 55, 50, 45, 40], // E4 B3 G3 D3 A2 E2
    bass4: [43, 38, 33, 28],           // G2 D2 A1 E1
    bass5: [43, 38, 33, 28, 23],       // G2 D2 A1 E1 B0
}

/* MIDI-номер ноты с высотой pitch (0–11), ближайший к reference: от 6 полутонов ниже до 5 выше
   (струну вниз перестраивать безопаснее). Так из названия ноты на струне получается её октава:
   D на 6-й струне гитары -> D2 (Drop D), а не D3; D на 4-й струне баса -> D1. */
const nearestMidi = (pitch, reference) => {
    let delta = (pitch - (reference % 12) + 12) % 12
    if (delta > 5) delta -= 12
    return reference + delta
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PITCHES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

// ступени гаммы — интервалы от тоники в полутонах
const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],         // натуральный мажор (ионийский лад)
    minor: [0, 2, 3, 5, 7, 8, 10],         // натуральный минор (эолийский лад)
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11], // гармонический минор: VII ступень повышена
    majorPentatonic: [0, 2, 4, 7, 9],      // мажорная пентатоника: мажор без 4 и 7
    minorPentatonic: [0, 3, 5, 7, 10],     // минорная пентатоника: минор без 2 и 6
    blues: [0, 3, 5, 6, 7, 10],            // блюзовая гамма (минорная): 1 b3 4 b5 5 b7
    dorian: [0, 2, 3, 5, 7, 9, 10],        // лады — мажорная гамма от другой ступени
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
}

// названия гамм (в заголовках) и группы для select'а выбора гаммы
const SCALE_NAMES = {
    major: 'Major',
    minor: 'Minor',
    harmonicMinor: 'Harmonic minor',
    majorPentatonic: 'Major pentatonic',
    minorPentatonic: 'Minor pentatonic',
    blues: 'Blues',
    dorian: 'Dorian',
    phrygian: 'Phrygian',
    lydian: 'Lydian',
    mixolydian: 'Mixolydian',
    locrian: 'Locrian',
}

const SCALE_GROUPS = [
    ['Major & minor', ['major', 'minor', 'harmonicMinor']],
    ['Pentatonic & blues', ['majorPentatonic', 'minorPentatonic', 'blues']],
    ['Modes', ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']],
]

// мажор и минор — это ионийский и эолийский лады; отдельными пунктами их не дублируем, только подписываем
const SCALE_ALIASES = { major: 'Ionian', minor: 'Aeolian' }

/* Родительская гамма для неполных (не 7-ступенных) гамм. Пентатоники берут аккорды родительской
   тональности: пентатонику играют поверх её аккордов, а сложить терциями 5 ступеней нельзя. */
const PARENT_SCALES = { majorPentatonic: 'major', minorPentatonic: 'minor', blues: 'minor' }

// аккорды: интервалы от основного тона в полутонах, приписка к названию и подпись для списка
const CHORDS = {
    major: { suffix: '',     label: 'Major',            intervals: [0, 4, 7] },
    minor: { suffix: 'm',    label: 'Minor (m)',        intervals: [0, 3, 7] },
    dom7:  { suffix: '7',    label: 'Dominant 7 (7)',   intervals: [0, 4, 7, 10] },
    maj7:  { suffix: 'maj7', label: 'Major 7 (maj7)',   intervals: [0, 4, 7, 11] },
    m7:    { suffix: 'm7',   label: 'Minor 7 (m7)',     intervals: [0, 3, 7, 10] },
    mMaj7: { suffix: 'm(maj7)', label: 'Minor-major 7 (m(maj7))', intervals: [0, 3, 7, 11] },
    dim:   { suffix: 'dim',  label: 'Diminished (dim)', intervals: [0, 3, 6] },
    m7b5:  { suffix: 'm7♭5', label: 'Half-dim (m7♭5)',  intervals: [0, 3, 6, 10] },
    dim7:  { suffix: 'dim7', label: 'Diminished 7 (dim7)', intervals: [0, 3, 6, 9] },
    aug:   { suffix: 'aug',  label: 'Augmented (aug)',  intervals: [0, 4, 8] },
    augMaj7: { suffix: 'maj7♯5', label: 'Augmented major 7 (maj7♯5)', intervals: [0, 4, 8, 11] },
    sus2:  { suffix: 'sus2', label: 'Sus2',             intervals: [0, 2, 7] },
    sus4:  { suffix: 'sus4', label: 'Sus4',             intervals: [0, 5, 7] },
}

// название ступени аккорда по интервалу от основного тона (9 бывает только в dim7 — уменьшённая септима)
const DEGREES = { 0: 'R', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '♭♭7', 10: '♭7', 11: '7' }

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

/* ---------- написание нот ---------- */

// высота (0–11) по любому написанию: 'B♭' -> 10, 'A♯' -> 10, 'F♯♯' -> 7, 'C♭' -> 11
const pitchOf = name => {
    const sharps = (name.match(/[♯#]/g) || []).length
    const flats = (name.match(/♭/g) || []).length
    return (LETTER_PITCHES[name[0]] + sharps - flats + 12) % 12
}

// буква + знаки до нужной высоты: spellNote('B', 10) -> 'B♭', spellNote('F', 7) -> 'F♯♯'
const spellNote = (letter, pitch) => {
    let shift = (pitch - LETTER_PITCHES[letter] + 12) % 12
    if (shift > 6) shift -= 12
    return letter + (shift > 0 ? '♯'.repeat(shift) : '♭'.repeat(-shift))
}

const letterAbove = (letter, steps) => LETTERS[(LETTERS.indexOf(letter) + steps) % 7]

// от какой ступени мажора строится 7-ступенная гамма (в полутонах): D dorian — от 2-й ступени C major
const MODE_OFFSETS = { major: 0, dorian: 2, phrygian: 4, lydian: 5, mixolydian: 7, minor: 9, harmonicMinor: 9, locrian: 11 }

/* Названия всех 12 нот в тональности: массив «высота -> название».
   7-ступенная гамма пишется от тоники родственного мажора (тоники мажоров — FLAT_NAMES) буквами
   подряд, так что каждая буква встречается один раз: F major -> F G A B♭ C D E, D minor -> … B♭ C,
   A harmonic minor -> … F G♯, G dorian (родственный F major) -> G A B♭ C D E F.
   Пентатоники и блюз берут написание родительской гаммы (PARENT_SCALES); «блюзовая нота» ♭5 —
   бемоль от буквы квинты (A blues: E♭), а если получается дубль-бемоль — от кварты.
   Ноты вне гаммы: в бемольных тональностях бемолями, в остальных диезами. */
const getKeyNames = (root, type) => {
    const rootPitch = pitchOf(root)
    const base = PARENT_SCALES[type] || type // 7-ступенная гамма, чьи знаки берём
    const majorPitch = (rootPitch - MODE_OFFSETS[base] + 12) % 12
    const majorTonic = FLAT_NAMES[majorPitch]
    const tonicLetter = letterAbove(majorTonic[0], SCALES.major.indexOf(MODE_OFFSETS[base]))

    const isFlatKey = majorTonic.includes('♭') || majorTonic === 'F'
    const names = (isFlatKey ? FLAT_NAMES : NOTES).slice()
    SCALES[base].forEach((interval, degree) => {
        const pitch = (rootPitch + interval) % 12
        names[pitch] = spellNote(letterAbove(tonicLetter, degree), pitch)
    })
    if (type === 'blues') {
        const pitch = (rootPitch + 6) % 12
        const flatFifth = spellNote(letterAbove(tonicLetter, 4), pitch)
        names[pitch] = flatFifth.includes('♭♭') ? spellNote(letterAbove(tonicLetter, 3), pitch) : flatFifth
    }
    return names
}

// на сколько букв ступень аккорда выше основного тона: терция — на 2, квинта — на 4, септима — на 6
const DEGREE_LETTER_STEPS = { 0: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: 4, 9: 6, 10: 6, 11: 6 }

const spellChordFrom = (rootName, quality) => CHORDS[quality].intervals.map(interval =>
    spellNote(letterAbove(rootName[0], DEGREE_LETTER_STEPS[interval]), (pitchOf(rootName) + interval) % 12))

/* Названия нот аккорда в тональности keyNames. Если все ноты аккорда из тональности — как в ней
   (Gm в F major: G B♭ D). Иначе пишем по буквам от основного тона (D в F major: D F♯ A), а если так
   выходят дубль-знаки — пробуем энгармонически другой основной тон (A♯ в C major -> B♭ D F). */
const spellChord = (rootPitch, quality, keyNames, keyPitches) => {
    const pitches = CHORDS[quality].intervals.map(interval => (rootPitch + interval) % 12)
    if (pitches.every(pitch => keyPitches.includes(pitch))) return pitches.map(pitch => keyNames[pitch])
    const candidates = [...new Set([keyNames[rootPitch], NOTES[rootPitch], FLAT_NAMES[rootPitch]])]
        .map(rootName => spellChordFrom(rootName, quality))
    const doubles = names => names.filter(name => /♯♯|♭♭/.test(name)).length
    return candidates.reduce((best, names) => (doubles(names) < doubles(best) ? names : best))
}

// нота на заданное число полутонов выше: transpose('A', 3) -> 'C'
const transpose = (note, semitones) => NOTES[(NOTES.indexOf(note) + semitones) % NOTES.length]

// ноты гаммы начиная с тоники: getScaleNotes('A', 'minor') -> ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const getScaleNotes = (root, type) => SCALES[type].map(interval => transpose(root, interval))

// ноты аккорда начиная с основного тона: getChordNotes('G', 'dom7') -> ['G', 'B', 'D', 'F']
const getChordNotes = (root, quality) => CHORDS[quality].intervals.map(interval => transpose(root, interval))

// ступени аккорда: getChordDegrees('dom7') -> ['R', '3', '5', '♭7']
const getChordDegrees = quality => CHORDS[quality].intervals.map(interval => DEGREES[interval])

// римская цифра ступени: минорные и уменьшённые аккорды — строчными (ii, vii°)
const getNumeral = (degree, quality) => {
    const numeral = ROMAN[degree]
    const minorThird = CHORDS[quality].intervals[1] === 3
    const marks = {
        dim: '°', aug: '+', dom7: '7', maj7: 'maj7', m7: '7', m7b5: 'ø7',
        dim7: '°7', mMaj7: '(maj7)', augMaj7: '+maj7',
    }
    return (minorThird ? numeral.toLowerCase() : numeral) + (marks[quality] || '')
}

// аккорд по набору интервалов: [0, 3, 7] -> 'minor'
const findChordQuality = intervals =>
    Object.keys(CHORDS).find(quality => CHORDS[quality].intervals.join() === intervals.join())

/* Аккорды тональности. size: 3 — трезвучия, 4 — септаккорды.
   Для 7-ступенных гамм на каждой ступени складываем ноты гаммы через одну (по терциям):
   C major -> C Dm Em F G Am Bdim, A harmonic minor -> Am Bdim Caug Dm E F G♯dim.
   Неполные гаммы терциями не сложить: в блюзе берём классические I, IV, V (септаккорды — I7, IV7, V7),
   у пентатоник — аккорды родительской тональности (C major pentatonic -> аккорды C major). */
const getKeyChords = (root, type, size) => {
    if (type !== 'blues' && PARENT_SCALES[type]) return getKeyChords(root, PARENT_SCALES[type], size)
    if (type === 'blues') {
        const quality = size === 4 ? 'dom7' : 'major'
        return [[0, 0], [5, 3], [7, 4]].map(([semitones, degree]) => ({
            root: transpose(root, semitones),
            quality,
            numeral: getNumeral(degree, quality),
        }))
    }
    const steps = SCALES[type]
    return steps.map((step, degree) => {
        const intervals = [0, 2, 4, 6].slice(0, size)
            .map(k => (steps[(degree + k) % steps.length] - step + 12) % 12)
        const quality = findChordQuality(intervals)
        return { root: transpose(root, step), quality, numeral: getNumeral(degree, quality) }
    })
}
