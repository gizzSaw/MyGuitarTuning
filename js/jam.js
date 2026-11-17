/* Режим джема: Learn | Jam в шапке. В Jam скрыты карточки Tuning и Chord и видна карточка Jam — пэд только
   с нотами тональности из карточки Key: три ряда — три октавы (снизу нижняя), в ряду — ступени гаммы по высоте,
   тоника — цветом --root. Играть можно пальцами (несколько сразу и скольжением), мышью и клавиатурой.
   Звук — Guitar | Bass | Piano: только тембр, строй и грифы он не меняет. Звук и октава — в localStorage.
   Подключается последним: пользуется playMidi, releaseVoice, stopSequence, stopPlayback, flashNeckNotes,
   flashPianoKey из sound.js, keyRootSelect и keyTypeSelect из neck.js, SCALES и getKeyNames из theory.js. */

const JAM_STORAGE_KEY = 'myGuitarTuning.jam'
const JAM_ROWS = 3

// октава нижнего ряда пэда (C3 = 3): по умолчанию и пределы — у каждого звука свой регистр
const JAM_OCTAVES = {
    guitar: { start: 3, min: 2, max: 4 },
    bass: { start: 1, min: 0, max: 2 },
    piano: { start: 3, min: 1, max: 5 },
}

/* Клавиатура: ряды снизу вверх — Z…M нижняя октава, A…L средняя, Q…O верхняя, по ступеням гаммы подряд.
   Лишние клавиши ряда продолжают гамму в следующую октаву (в 7-ступенной гамме K и L — 1-я и 2-я ступени
   верхнего ряда). event.code — физическое место клавиши, поэтому работает и в русской раскладке. */
const JAM_KEY_ROWS = [
    ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'],
    ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL'],
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'],
]

let jamMode = false
let jamSound = 'guitar'
const jamOctaves = Object.fromEntries(Object.entries(JAM_OCTAVES).map(([sound, range]) => [sound, range.start]))
const jamPresses = new Map() // палец ('p' + pointerId) или клавиша ('k' + code) -> { button, voice }

const modeBtns = document.querySelectorAll('.header__mode .segmented__btn') // Learn | Jam
const mainGrid = document.querySelector('.main')
const tuningCard = document.querySelector('.tuning')
const chordCard = document.querySelector('.chord')
const jamCard = document.querySelector('.jam')
const jamPad = document.querySelector('.jam__pad')
const jamHint = document.querySelector('.jam__hint')
const jamSoundBtns = document.querySelectorAll('.jam__sound .segmented__btn') // Guitar | Bass | Piano
const jamOctaveBtns = document.querySelectorAll('.jam__octave-btn')          // − +
const jamOctaveLabel = document.querySelector('.jam__octave-label')

const loadJam = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(JAM_STORAGE_KEY))
        if (saved && JAM_OCTAVES[saved.sound]) jamSound = saved.sound
        Object.entries(JAM_OCTAVES).forEach(([sound, { min, max }]) => {
            const octave = saved && saved.octaves && saved.octaves[sound]
            if (Number.isInteger(octave) && octave >= min && octave <= max) jamOctaves[sound] = octave
        })
    } catch (error) {
        // localStorage недоступен — звук и октавы по умолчанию
    }
}

const saveJam = () => {
    try {
        localStorage.setItem(JAM_STORAGE_KEY, JSON.stringify({ sound: jamSound, octaves: jamOctaves }))
    } catch (error) {
        // не сохранилось — не страшно
    }
}

const makeJamSpan = (className, text) => {
    const span = document.createElement('span')
    span.className = className
    span.textContent = text
    return span
}

// пэд из тональности карточки Key; без тональности — подсказка
const renderJamPad = () => {
    const root = keyRootSelect.value
    jamHint.hidden = Boolean(root)
    jamPad.hidden = !root
    const { min, max } = JAM_OCTAVES[jamSound]
    const octave = jamOctaves[jamSound]
    jamOctaveLabel.textContent = `Octaves ${octave}–${octave + JAM_ROWS - 1}`
    jamOctaveBtns.forEach(btn => {
        btn.disabled = Number(btn.dataset.step) < 0 ? octave <= min : octave >= max
    })
    if (!root) {
        jamPad.replaceChildren()
        return
    }
    const type = keyTypeSelect.value
    const steps = SCALES[type]
    const names = getKeyNames(root, type) // названия по тональности: B♭ в F major
    const base = 12 * (octave + 1) + pitchOf(root) // MIDI тоники нижнего ряда
    jamPad.style.setProperty('--degrees', steps.length)
    const buttons = []
    for (let row = JAM_ROWS - 1; row >= 0; row--) { // сверху — верхняя октава, как ряды клавиатуры
        steps.forEach((step, degree) => {
            const midi = base + row * 12 + step
            const button = document.createElement('button')
            button.type = 'button'
            button.className = degree === 0 ? 'jam__btn jam__btn_root' : 'jam__btn'
            button.dataset.midi = midi
            button.dataset.row = row
            button.dataset.degree = degree
            button.setAttribute('aria-label', `${names[midi % 12]}${Math.floor(midi / 12) - 1}`)
            button.append(makeJamSpan('jam__note', names[midi % 12]), makeJamSpan('jam__degree', String(degree + 1)))
            const keyCode = JAM_KEY_ROWS[row][degree]
            if (keyCode) button.append(makeJamSpan('jam__key', keyCode.slice(3)))
            buttons.push(button)
        })
    }
    jamPad.replaceChildren(...buttons)
}

/* ---------- игра ---------- */

const releaseJam = id => {
    const press = jamPresses.get(id)
    if (!press) return
    jamPresses.delete(id)
    if (![...jamPresses.values()].some(other => other.button === press.button)) {
        press.button.classList.remove('jam__btn_active')
    }
    if (press.voice.timbre === 'piano') releaseVoice(press.voice) // щипок струны звучит сам и затихает
}

const releaseAllJam = () => [...jamPresses.keys()].forEach(releaseJam)

/* Фокус. Список, в котором выбрали тональность мышью, остаётся в фокусе, а в полях клавиши пэда отключены,
   и нажатие на пэд фокус не забирает (preventDefault). Поэтому после выбора мышью и после нажатия на пэд
   фокус переходит на сам пэд (tabindex="-1"). Если список листают с клавиатуры, фокус остаётся в нём. */
let isKeySelectByKeyboard = false

const focusJamPad = () => {
    if (jamMode && !jamPad.hidden) jamPad.focus({ preventScroll: true })
}

// нажать кнопку пэда пальцем, мышью или клавишей id; последовательность из других карточек прерывается
const pressJam = (button, id) => {
    releaseJam(id)
    stopSequence()
    const midi = Number(button.dataset.midi)
    const voice = playMidi(midi, getAudio().currentTime, jamSound === 'piano' ? 0.8 : 1, jamSound)
    jamPresses.set(id, { button, voice })
    button.classList.add('jam__btn_active')
    flashNeckNotes([midi % 12]) // та же нота на грифах гитары и баса
    flashPianoKey(midi)
}

// пальцы и мышь: несколько нот сразу; палец перешёл на другую кнопку — играем её (скольжение)
jamPad.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const button = event.target.closest('.jam__btn')
    if (!button) return
    event.preventDefault() // без выделения текста и долгого нажатия
    focusJamPad() // фокус мог остаться в списке тональности — тогда клавиатура молчала бы
    try {
        jamPad.setPointerCapture(event.pointerId) // движения пальца приходят сюда, даже если он ушёл с кнопки
    } catch (error) {
        // у синтетических событий захвата нет — не страшно
    }
    pressJam(button, `p${event.pointerId}`)
})

jamPad.addEventListener('pointermove', event => {
    const press = jamPresses.get(`p${event.pointerId}`)
    if (!press) return
    const under = document.elementFromPoint(event.clientX, event.clientY)
    const button = under && under.closest('.jam__btn')
    if (button && button !== press.button && jamPad.contains(button)) pressJam(button, `p${event.pointerId}`)
})

;['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type =>
    jamPad.addEventListener(type, event => releaseJam(`p${event.pointerId}`)))

// кнопка в фокусе и Enter/Пробел — короткая нота
jamPad.addEventListener('click', event => {
    if (event.detail !== 0) return
    const button = event.target.closest('.jam__btn')
    if (!button) return
    pressJam(button, 'click')
    setTimeout(() => releaseJam('click'), 300)
})

// кнопка пэда для клавиши: ступени подряд по рядам, лишние клавиши — в следующую октаву
const jamButtonForKey = code => {
    const degrees = Number(jamPad.style.getPropertyValue('--degrees'))
    const row = JAM_KEY_ROWS.findIndex(keys => keys.includes(code))
    if (row < 0 || !degrees || jamPad.hidden) return null
    const index = row * degrees + JAM_KEY_ROWS[row].indexOf(code)
    if (Math.floor(index / degrees) >= JAM_ROWS) return null // выше верхнего ряда пэда
    return jamPad.querySelector(`[data-row="${Math.floor(index / degrees)}"][data-degree="${index % degrees}"]`)
}

const shiftJamOctave = step => {
    const { min, max } = JAM_OCTAVES[jamSound]
    const octave = Math.min(max, Math.max(min, jamOctaves[jamSound] + step))
    if (octave === jamOctaves[jamSound]) return
    jamOctaves[jamSound] = octave
    saveJam()
    releaseAllJam()
    renderJamPad()
}

// клавиши работают только в режиме Jam, не мешают полям ввода и сочетаниям с Ctrl/Cmd/Alt
const isTypingTarget = target => Boolean(target.closest && target.closest('input, select, textarea, [contenteditable="true"]'))

document.addEventListener('keydown', event => {
    if (!jamMode || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
    if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault()
        if (!event.repeat) shiftJamOctave(event.code === 'ArrowRight' ? 1 : -1)
        return
    }
    const button = jamButtonForKey(event.code)
    if (!button) return
    event.preventDefault()
    if (event.repeat || jamPresses.has(`k${event.code}`)) return // зажатая клавиша не перезапускает ноту
    pressJam(button, `k${event.code}`)
})

document.addEventListener('keyup', event => releaseJam(`k${event.code}`))
window.addEventListener('blur', releaseAllJam) // окно потеряло фокус — keyup уже не придёт

/* ---------- переключатели ---------- */

const applyJamMode = () => {
    modeBtns.forEach(btn => btn.setAttribute('aria-pressed', (btn.dataset.mode === 'jam') === jamMode))
    tuningCard.hidden = jamMode
    chordCard.hidden = jamMode
    jamCard.hidden = !jamMode
    mainGrid.classList.toggle('main_jam', jamMode)
}

modeBtns.forEach(btn => btn.addEventListener('click', () => {
    const toJam = btn.dataset.mode === 'jam'
    if (toJam === jamMode) return
    jamMode = toJam
    stopPlayback() // в т. ч. Repeat струны в скрытой карточке Tuning
    releaseAllJam()
    applyJamMode()
    renderJamPad()
}))

const applyJamSound = () =>
    jamSoundBtns.forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.sound === jamSound))

jamSoundBtns.forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.sound === jamSound) return
    jamSound = btn.dataset.sound
    saveJam()
    releaseAllJam()
    applyJamSound()
    renderJamPad()
}))

jamOctaveBtns.forEach(btn => btn.addEventListener('click', () => shiftJamOctave(Number(btn.dataset.step))))

// тональность сменилась в карточке Key — новый пэд (обработчики neck.js подключены раньше)
;[keyRootSelect, keyTypeSelect].forEach(select => {
    select.addEventListener('pointerdown', () => { isKeySelectByKeyboard = false })
    select.addEventListener('keydown', () => { isKeySelectByKeyboard = true })
    select.addEventListener('change', () => {
        releaseAllJam()
        renderJamPad()
        if (!isKeySelectByKeyboard) focusJamPad()
    })
})

loadJam()
applyJamSound()
applyJamMode()
renderJamPad()
