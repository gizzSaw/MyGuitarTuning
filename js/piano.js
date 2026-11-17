/* Клавиатура пианино в карточке «Piano»: C3…C5 (на телефоне CSS прячет нижнюю октаву — C4…C5).
   Подсвечивает те же ноты, что и гриф: highlightPiano() вызывает highlightNeck() из neck.js.
   Звук по нажатию — в sound.js. Подключается после theory.js (нужен NOTES) и до main.js. */

const PIANO_FIRST = 48 // C3 (MIDI)
const PIANO_LAST = 72  // C5
const BLACK_NOTES = [1, 3, 6, 8, 10] // C# D# F# G# A#

const pianoKeysBox = document.querySelector('.piano__keys')
const pianoKeys = []

// белые клавиши идут подряд, чёрные лежат поверх них на границе между белыми (--pos — номер этой границы)
let whiteCount = 0
for (let midi = PIANO_FIRST; midi <= PIANO_LAST; midi++) {
    const note = NOTES[midi % 12]
    const octave = Math.floor(midi / 12) - 1
    const isBlack = BLACK_NOTES.includes(midi % 12)

    const key = document.createElement('button')
    key.type = 'button'
    key.className = `piano__key ${isBlack ? 'piano__key_black' : 'piano__key_white'}`
    if (midi < 60) key.classList.add('piano__key_low') // нижняя октава — на узком экране скрыта
    key.dataset.midi = midi
    key.dataset.note = note
    key.setAttribute('aria-label', note + octave)
    // на C подписываем октаву, чтобы было видно, где какая
    key.textContent = note === 'C' ? note + octave : note

    if (isBlack) {
        key.style.setProperty('--pos', whiteCount)
    } else {
        whiteCount++
    }
    pianoKeys.push(key)
}
pianoKeysBox.style.setProperty('--whites', whiteCount)
pianoKeysBox.append(...pianoKeys)

// те же правила, что и на грифе: основной тон, ноты аккорда/тональности, ноты тональности вне аккорда
const highlightPiano = (root, mainNotes, contextNotes) => {
    pianoKeys.forEach(key => {
        const note = key.dataset.note
        const isMain = mainNotes.includes(note)
        key.classList.toggle('piano__key_root', root !== '' && note === root)
        key.classList.toggle('piano__key_tone', isMain && note !== root)
        key.classList.toggle('piano__key_key', !isMain && contextNotes.includes(note))
    })
}
