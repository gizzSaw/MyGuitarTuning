/* Клавиатура пианино в карточке «Piano»: C3…C5 (на телефоне CSS прячет нижнюю октаву — C4…C5).
   Подсвечивает те же ноты, что и гриф: highlightPiano() вызывает highlightNeck() из neck.js.
   Звук по нажатию — в sound.js. Подключается после theory.js (нужен NOTES) и до main.js. */

const PIANO_FIRST = 48 // C3 (MIDI)
const PIANO_LAST = 72  // C5
const BLACK_NOTES = [1, 3, 6, 8, 10] // C♯ D♯ F♯ G♯ A♯

const pianoKeysBox = document.querySelector('.piano__keys')
const pianoKeys = []

// подпись клавиши; на C — с октавой, чтобы было видно, где какая
const pianoKeyLabel = (name, midi) => (name === 'C' ? name + (Math.floor(midi / 12) - 1) : name)

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
    key.setAttribute('aria-label', note + octave)
    key.textContent = pianoKeyLabel(note, midi)

    if (isBlack) {
        key.style.setProperty('--pos', whiteCount)
    } else {
        whiteCount++
    }
    pianoKeys.push(key)
}
pianoKeysBox.style.setProperty('--whites', whiteCount)
pianoKeysBox.append(...pianoKeys)

/* Те же правила, что и на грифе: основной тон, ноты аккорда/тональности, ноты тональности вне аккорда.
   Сравниваем высоты (0–11); rootPitch -1 — ничего не выбрано. names — подписи по тональности (B♭ или A♯). */
const highlightPiano = (rootPitch, mainPitches, contextPitches, names) => {
    pianoKeys.forEach(key => {
        const midi = Number(key.dataset.midi)
        const pitch = midi % 12
        const isMain = mainPitches.includes(pitch)
        key.textContent = pianoKeyLabel(names[pitch], midi)
        key.setAttribute('aria-label', names[pitch] + (Math.floor(midi / 12) - 1))
        key.classList.toggle('piano__key_root', pitch === rootPitch)
        key.classList.toggle('piano__key_tone', isMain && pitch !== rootPitch)
        key.classList.toggle('piano__key_key', !isMain && contextPitches.includes(pitch))
    })
}
