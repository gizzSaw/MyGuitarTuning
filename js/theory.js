/* Музыкальная теория: гаммы, аккорды и аккорды тональности.
   Только данные и чистые функции, с DOM файл не работает.
   Подключается первым (theory.js → neck.js → main.js). NOTES объявлен в main.js, поэтому
   здесь он используется только внутри функций, которые вызываются после загрузки всех скриптов. */

// ступени гаммы — интервалы от тоники в полутонах
const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], // натуральный мажор
    minor: [0, 2, 3, 5, 7, 8, 10], // натуральный минор
    blues: [0, 3, 5, 6, 7, 10],    // блюзовая гамма (минорная): 1 b3 4 b5 5 b7
}

// аккорды: интервалы от основного тона в полутонах, приписка к названию и подпись для списка
const CHORDS = {
    major: { suffix: '',     label: 'Major',            intervals: [0, 4, 7] },
    minor: { suffix: 'm',    label: 'Minor (m)',        intervals: [0, 3, 7] },
    dom7:  { suffix: '7',    label: 'Dominant 7 (7)',   intervals: [0, 4, 7, 10] },
    maj7:  { suffix: 'maj7', label: 'Major 7 (maj7)',   intervals: [0, 4, 7, 11] },
    m7:    { suffix: 'm7',   label: 'Minor 7 (m7)',     intervals: [0, 3, 7, 10] },
    dim:   { suffix: 'dim',  label: 'Diminished (dim)', intervals: [0, 3, 6] },
    m7b5:  { suffix: 'm7♭5', label: 'Half-dim (m7♭5)',  intervals: [0, 3, 6, 10] },
    aug:   { suffix: 'aug',  label: 'Augmented (aug)',  intervals: [0, 4, 8] },
    sus2:  { suffix: 'sus2', label: 'Sus2',             intervals: [0, 2, 7] },
    sus4:  { suffix: 'sus4', label: 'Sus4',             intervals: [0, 5, 7] },
}

// название ступени аккорда по интервалу от основного тона
const DEGREES = { 0: 'R', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 10: '♭7', 11: '7' }

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// нота на заданное число полутонов выше: transpose('A', 3) -> 'C'
const transpose = (note, semitones) => NOTES[(NOTES.indexOf(note) + semitones) % NOTES.length]

// ноты гаммы начиная с тоники: getScaleNotes('A', 'minor') -> ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const getScaleNotes = (root, type) => SCALES[type].map(interval => transpose(root, interval))

// ноты аккорда начиная с основного тона: getChordNotes('G', 'dom7') -> ['G', 'B', 'D', 'F']
const getChordNotes = (root, quality) => CHORDS[quality].intervals.map(interval => transpose(root, interval))

// ступени аккорда: getChordDegrees('dom7') -> ['R', '3', '5', '♭7']
const getChordDegrees = quality => CHORDS[quality].intervals.map(interval => DEGREES[interval])

const getChordName = (root, quality) => root + CHORDS[quality].suffix

// римская цифра ступени: минорные и уменьшённые аккорды — строчными (ii, vii°)
const getNumeral = (degree, quality) => {
    const numeral = ROMAN[degree]
    const minorThird = CHORDS[quality].intervals[1] === 3
    const marks = { dim: '°', aug: '+', dom7: '7', maj7: 'maj7', m7: '7', m7b5: 'ø7' }
    return (minorThird ? numeral.toLowerCase() : numeral) + (marks[quality] || '')
}

// аккорд по набору интервалов: [0, 3, 7] -> 'minor'
const findChordQuality = intervals =>
    Object.keys(CHORDS).find(quality => CHORDS[quality].intervals.join() === intervals.join())

/* Аккорды тональности. size: 3 — трезвучия, 4 — септаккорды.
   Для 7-ступенных гамм на каждой ступени складываем ноты гаммы через одну (по терциям):
   C major -> C Dm Em F G Am Bdim. В блюзовой гамме 6 ступеней, терциями её не сложить,
   поэтому берём классические для блюза I, IV, V (септаккорды — I7, IV7, V7). */
const getKeyChords = (root, type, size) => {
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
