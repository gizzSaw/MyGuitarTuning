/* Аппликатуры аккордов: какой лад зажимать на каждой струне — под текущий строй, а не из таблицы.
   Чистые функции без DOM. Струны приходят массивом открытых нот в MIDI по номеру струны:
   openMidis[0] — 1-я (самая тонкая), openMidis[n - 1] — самая толстая. Число струн и ладов не зашито,
   так что подойдёт и для баса с 4–5 струнами. Подключается после theory.js. */

const SHAPE_SPAN = 4         // окно — 4 лада подряд: растяжка не больше 4 ладов
const SHAPE_MAX_FINGERS = 4  // баррэ считается за один палец
const SHAPE_LIMIT = 8        // сколько позиций показывать

// интервалы между соседними струнами стандартного строя, от 1-й к 6-й: E4 B3 G3 D3 A2 E2
const STANDARD_STEPS = [5, 4, 5, 5, 5]

// стандартный строй с любой тоники (E, D, C… Standard), но не Drop — только в нём подписываем формы CAGED
const isStandardTuning = openMidis => openMidis.length === STANDARD_STEPS.length + 1 &&
    STANDARD_STEPS.every((step, i) => openMidis[i] - openMidis[i + 1] === step)

/* Сколько нужно пальцев. Баррэ — на самом нижнем прижатом ладу, если им прижаты хотя бы две струны
   и все струны между ними прижаты не ниже этого лада (открытая струна под баррэ не прозвучит). */
const countFingers = frets => {
    const fretted = frets.map((fret, string) => ({ fret, string })).filter(note => note.fret > 0)
    if (!fretted.length) return { fingers: 0, barre: 0 }
    const low = Math.min(...fretted.map(note => note.fret))
    const atLow = fretted.filter(note => note.fret === low).map(note => note.string)
    if (atLow.length >= 2) {
        const covered = frets.slice(Math.min(...atLow), Math.max(...atLow) + 1)
            .every(fret => fret !== null && fret >= low)
        if (covered) return { fingers: 1 + fretted.filter(note => note.fret > low).length, barre: low }
    }
    return { fingers: fretted.length, barre: 0 }
}

/* Оценка неудобства (меньше — удобнее): пальцы, растяжка, баррэ, высокая позиция и заглушённые тонкие
   струны — минус; открытые струны и полнота звучания — плюс.
   Open C (x32010) < A-форма C (x35553) < E-форма C (8 10 10 9 8 8); open G 320003 лучше, чем 32000x. */
const scoreShape = shape =>
    shape.fingers + 0.8 * shape.span + 0.15 * shape.position + (shape.barre ? 0.5 : 0) -
    0.4 * shape.openCount - shape.played + 0.8 * shape.trebleMuted

/* Все удобные аппликатуры аккорда. frets — лад на каждой струне: null — X (не играет), 0 — открытая.
   Правила: в каждой струне нота аккорда или X; играющие струны идут подряд; звучат хотя бы 4 струны из 6
   (из 4–5 — на одну-две меньше); в басу основной тон; все ноты аккорда есть; растяжка ≤ 4 ладов;
   пальцев ≤ 4. Из похожих (тот же бас на той же струне и ладу, форма в ту же сторону от баса)
   оставляем самую удобную, всё сортируем по удобству. */
const findChordShapes = (openMidis, rootPitch, chordPitches, maxFret) => {
    const strings = openMidis.length
    const minPlayed = Math.max(3, strings - 2)
    const best = new Map() // группа похожих позиций -> лучшая из них

    const consider = frets => {
        const played = frets.map((fret, string) => ({ fret, string })).filter(note => note.fret !== null)
        if (played.length < minPlayed) return
        if (played[played.length - 1].string - played[0].string + 1 !== played.length) return // X посередине

        const midis = played.map(note => openMidis[note.string] + note.fret)
        const bass = played[midis.indexOf(Math.min(...midis))]
        if ((openMidis[bass.string] + bass.fret) % 12 !== rootPitch) return
        if (!chordPitches.every(pitch => midis.some(midi => midi % 12 === pitch))) return

        const { fingers, barre } = countFingers(frets)
        if (fingers > SHAPE_MAX_FINGERS) return
        const frettedFrets = played.map(note => note.fret).filter(fret => fret > 0)
        const position = frettedFrets.length ? Math.min(...frettedFrets) : 0
        const shape = {
            frets,
            bassString: bass.string,
            bassFret: bass.fret,
            // форма лежит ниже баса (к порожку, как C и G) или от него вверх по грифу (как A и E)
            towardNut: position < bass.fret,
            position,
            span: frettedFrets.length ? Math.max(...frettedFrets) - position : 0,
            fingers,
            barre,
            openCount: played.filter(note => note.fret === 0).length,
            played: played.length,
            trebleMuted: played[0].string, // сколько тонких струн заглушено (X со стороны 1-й струны)
        }
        shape.score = scoreShape(shape)
        const group = `${shape.bassString}:${shape.bassFret}:${shape.towardNut}`
        if (!best.has(group) || best.get(group).score > shape.score) best.set(group, shape)
    }

    /* Окна по 4 лада. Открытые струны — только в первом окне (открытая позиция): посреди грифа они дают
       гибриды вроде x35050 вместо A-формы x35553. Позиции выше maxFret не строим — гриф кончается. */
    const seen = new Set()
    for (let start = 1; start + SHAPE_SPAN - 1 <= maxFret; start++) {
        const options = openMidis.map(open =>
            [null, ...(start === 1 ? [0] : []), ...Array.from({ length: SHAPE_SPAN }, (_, k) => start + k)]
                .filter(fret => fret === null || chordPitches.includes((open + fret) % 12)))
        const frets = new Array(strings)
        const walk = string => {
            if (string === strings) {
                const key = frets.join()
                if (!seen.has(key)) { seen.add(key); consider(frets.slice()) }
                return
            }
            for (const fret of options[string]) { frets[string] = fret; walk(string + 1) }
        }
        walk(0)
    }
    return [...best.values()].sort((a, b) => a.score - b.score).slice(0, SHAPE_LIMIT)
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th']

/* Подпись позиции. В стандартном строе — форма CAGED: бас на 6-й струне и форма от него вверх — E,
   к порожку — G; на 5-й — A или C; на 4-й — D. В остальных строях — «Bass on 6th string». */
const describeShape = (shape, openMidis) => {
    const string = shape.bassString + 1
    const cagedByString = { 6: shape.towardNut ? 'G' : 'E', 5: shape.towardNut ? 'C' : 'A', 4: 'D' }
    const name = isStandardTuning(openMidis) && cagedByString[string]
        ? `${cagedByString[string]} shape`
        : `Bass on ${ORDINALS[string - 1]} string`
    const where = shape.openCount ? 'open'
        : shape.barre ? `barre, fret ${shape.barre}`
        : `fret ${shape.position}`
    return `${name} · ${where}`
}

// запись аппликатуры как в аккордовых схемах, от толстой струны к тонкой: x32010; с ладами ≥ 10 — через пробел
const shapeToString = shape => {
    const parts = shape.frets.slice().reverse().map(fret => (fret === null ? 'x' : String(fret)))
    return parts.join(parts.some(part => part.length > 1) ? ' ' : '')
}
