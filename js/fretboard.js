/* Гриф строится здесь, а не в HTML: число струн и ладов — параметры (гитара — 6 струн, бас — 4 или 5).
   Разметка та же, что была в HTML: .fret.fret_N > .string.stringM > .note, номер лада (.fret-number)
   стоит в клетке 1-й струны. У каждой ноты data-string и data-fret — по ним main.js пишет ноты,
   neck.js подсвечивает, sound.js играет. Толщина струн (--gauge) и места точек на ладах (--dot*)
   считаются от числа струн. Подключается после theory.js и shapes.js, до instrument.js. */

const NECK_FRETS = 12

const neckInner = document.querySelector('.guitar-neck__inner')

// толщина струны: от 1px у 1-й (тонкой) до 3px у самой толстой, с шагом 0,5px. 6 струн -> 1 1.5 2 2 2.5 3
const stringGauge = (string, strings) => Math.round((1 + (2 * (string - 1)) / (strings - 1)) * 2) / 2

const makeFretboardCell = (string, fret, strings) => {
    const cell = document.createElement('div')
    cell.className = `string string${string}`
    cell.style.setProperty('--gauge', `${stringGauge(string, strings)}px`)
    if (string === 1 && fret > 0) {
        const number = document.createElement('div')
        number.className = 'fret-number'
        number.textContent = fret
        cell.append(number)
    }
    const note = document.createElement('div')
    note.className = 'note'
    note.dataset.string = string
    note.dataset.fret = fret
    cell.append(note)
    return cell
}

/* Построить гриф заново. Точки на ладах — всегда между струнами, а не на струне (иначе их закроет кружок
   ноты): одна — на границе посередине (при нечётном числе струн — на ближайшей к середине), две на 12-м —
   симметрично на трети. Доли считаются от 1-й струны; 6 струн -> 50% и 33.3% / 66.7%, как было в CSS. */
const buildFretboard = (strings, frets = NECK_FRETS) => {
    const columns = []
    for (let fret = 0; fret <= frets; fret++) {
        const column = document.createElement('div')
        column.className = `fret fret_${fret}`
        for (let string = 1; string <= strings; string++) column.append(makeFretboardCell(string, fret, strings))
        columns.push(column)
    }
    const third = Math.floor(strings / 3)
    neckInner.style.setProperty('--dot', `${(Math.floor(strings / 2) / strings) * 100}%`)
    neckInner.style.setProperty('--dot-a', `${(third / strings) * 100}%`)
    neckInner.style.setProperty('--dot-b', `${((strings - third) / strings) * 100}%`)
    neckInner.replaceChildren(...columns)
}

// первый раз гриф строит instrument.js — по сохранённому инструменту (гитара 6 струн, бас 4 или 5)
