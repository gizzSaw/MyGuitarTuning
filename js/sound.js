/* Звук: струны (карточка «Tuning»), гамма тональности («Key») и аккорды («Chord»).
   Звук синтезируется алгоритмом Карплуса — Стронга (модель дёрнутой струны), аудиофайлов нет.
   Подключается последним: пользуется NOTES (main.js), SCALES/CHORDS/getKeyChords (theory.js),
   а также select'ами, keyType/chordSize, neckNotes и highlightNeck() из neck.js. */

// высота открытых струн в стандартном строе, MIDI-номера: E2 A2 D3 G3 B3 E4
const STANDARD_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 }

const REPEAT_INTERVAL = 2500 // мс между повторами струны в режиме Repeat
const STRUM_INTERVAL = 350   // мс между струнами в Play all
const SCALE_STEP = 0.32      // с между нотами гаммы
const CHORD_STRUM = 0.035    // с между нотами аккорда — как удар по струнам сверху вниз
const CHORD_STEP = 1.4       // с между аккордами тональности в Play all

const stringBoxes = document.querySelectorAll('.app__notes-item')
const playAllBtn = document.querySelector('.sound__all')
const repeatBtn = document.querySelector('.sound__repeat')
const soundStatus = document.querySelector('.sound__status')
const soundHint = soundStatus.textContent.trim()
const keyPlayBtn = document.querySelector('.key__play')
const chordPlayBtn = document.querySelector('.chord__play')
const chordPlayAllBtn = document.querySelector('.chord__play-all')

let audioCtx = null
let masterGain = null
const pluckBuffers = new Map()   // MIDI-номер -> готовый AudioBuffer
const activeVoices = new Set()   // все звучащие и запланированные ноты
const ringingStrings = new Map() // номер струны -> её звучащая нота (чтобы перезапустить, а не наложить)
let chordVoices = []             // ноты последнего аккорда — гасим их, когда звучит следующий
let sequenceTimers = []          // таймеры Play all, гаммы и аккордов тональности
let isRepeatOn = false
let repeatTimer = null
let repeatBox = null

/* MIDI-номер ноты на струне. Приложение знает только название ноты, поэтому октаву выбираем
   ближайшую к стандартной высоте этой струны: от 6 полутонов ниже до 5 выше
   (вниз перестраивать безопаснее для струн). Drop D -> D2 A2 D3 G3 B3 E4. */
const getStringMidi = box => {
    const standard = STANDARD_MIDI[box.dataset.string]
    const noteIndex = NOTES.indexOf(box.textContent.trim())
    let delta = (noteIndex - (standard % 12) + 12) % 12
    if (delta > 5) delta -= 12
    return standard + delta
}

const midiToFrequency = midi => 440 * 2 ** ((midi - 69) / 12)

// 40 -> 'E2' (MIDI 60 — это C4)
const midiToName = midi => NOTES[midi % 12] + (Math.floor(midi / 12) - 1)

/* Карплус — Стронг: линия задержки длиной в один период заполняется шумом (щипок),
   а на каждом проходе соседние отсчёты усредняются — высокие гармоники гаснут быстрее низких,
   как у настоящей струны. Период почти никогда не равен целому числу отсчётов, поэтому
   дробный остаток добирает фазовый (allpass) фильтр: иначе нота звучала бы фальшиво на несколько центов. */
const synthesizePluck = (frequency, sampleRate) => {
    const duration = 4      // секунды
    const decayTime = 3.5   // за сколько секунд основной тон затихает на 60 дБ
    const length = Math.floor(duration * sampleRate)
    const samples = new Float32Array(length)

    // период = линия задержки + 0.5 отсчёта от усреднения + дробная задержка allpass-фильтра (0.1…1.1)
    const period = sampleRate / frequency
    const delayLength = Math.floor(period - 0.5 - 0.1)
    const fraction = period - 0.5 - delayLength
    const allpass = (1 - fraction) / (1 + fraction)
    const loss = 10 ** (-3 / (decayTime * frequency)) // затухание за один период

    // щипок: шум, слегка сглаженный (мягче, как пальцем), без постоянной составляющей
    const line = new Float32Array(delayLength)
    let smooth = 0
    for (let i = 0; i < delayLength; i++) {
        smooth = 0.5 * smooth + 0.5 * (Math.random() * 2 - 1)
        line[i] = smooth
    }
    const mean = line.reduce((sum, value) => sum + value, 0) / delayLength
    for (let i = 0; i < delayLength; i++) line[i] -= mean

    let pointer = 0
    let previous = 0
    let allpassIn = 0
    let allpassOut = 0
    let peak = 0
    for (let i = 0; i < length; i++) {
        const current = line[pointer]
        samples[i] = current
        peak = Math.max(peak, Math.abs(current))

        const averaged = 0.5 * (current + previous) * loss
        previous = current
        const shifted = allpass * averaged + allpassIn - allpass * allpassOut
        allpassIn = averaged
        allpassOut = shifted

        line[pointer] = shifted
        pointer = (pointer + 1) % delayLength
    }

    // одинаковая громкость у всех нот и плавный конец без щелчка
    const fadeLength = Math.floor(0.3 * sampleRate)
    for (let i = 0; i < length; i++) {
        const fade = Math.min(1, (length - i) / fadeLength)
        samples[i] *= (0.8 / peak) * fade
    }
    return samples
}

/* AudioContext создаём при первом клике: до действия пользователя браузер звук не разрешает.
   На выходе компрессор — чтобы аккорд из 5–6 нот не перегружал звук. */
const getAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const compressor = audioCtx.createDynamicsCompressor()
        compressor.threshold.value = -6
        compressor.ratio.value = 8
        masterGain = audioCtx.createGain()
        masterGain.gain.value = 0.7
        masterGain.connect(compressor).connect(audioCtx.destination)
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
}

const getPluckBuffer = midi => {
    if (!pluckBuffers.has(midi)) {
        const samples = synthesizePluck(midiToFrequency(midi), audioCtx.sampleRate)
        const buffer = audioCtx.createBuffer(1, samples.length, audioCtx.sampleRate)
        buffer.copyToChannel(samples, 0)
        pluckBuffers.set(midi, buffer)
    }
    return pluckBuffers.get(midi)
}

// сыграть ноту в момент when (секунды по часам AudioContext); возвращает «голос», чтобы его можно было погасить
const playMidi = (midi, when, volume = 1) => {
    const ctx = getAudio()
    const source = ctx.createBufferSource()
    source.buffer = getPluckBuffer(midi)
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(masterGain)
    source.start(when)
    const voice = { source, gain }
    activeVoices.add(voice)
    source.onended = () => activeVoices.delete(voice)
    return voice
}

// быстро погасить ноту (как прижать струну ладонью); если она ещё не началась — просто не прозвучит
const releaseVoice = (voice, when = audioCtx.currentTime) => {
    if (voice.released) return // повторный stop() у одной ноты старый Safari считает ошибкой
    voice.released = true
    voice.gain.gain.setTargetAtTime(0, when, 0.03)
    voice.source.stop(when + 0.2)
}

// анимация вспышки; удаление класса и чтение offsetWidth перезапускают анимацию
const flash = (element, className) => {
    if (!element) return
    element.classList.remove(className)
    void element.offsetWidth
    element.classList.add(className)
}

// подсветить на грифе все места, где лежат эти ноты
const flashNeckNotes = names => neckNotes.forEach(note => {
    if (names.includes(note.textContent)) flash(note, 'note_playing')
})

const later = (callback, ms) => sequenceTimers.push(setTimeout(callback, ms))

const stopSequence = () => {
    sequenceTimers.forEach(clearTimeout)
    sequenceTimers = []
}

/* ---------- струны ---------- */

const describeString = (box, midi) =>
    `String ${box.dataset.string} · ${midiToName(midi)} · ${midiToFrequency(midi).toFixed(2)} Hz`

const pluckString = box => {
    const ctx = getAudio()
    const midi = getStringMidi(box)
    const string = box.dataset.string

    // если струна ещё звучит — гасим её, как при повторном щипке настоящей струны
    const ringing = ringingStrings.get(string)
    if (ringing) releaseVoice(ringing)
    ringingStrings.set(string, playMidi(midi, ctx.currentTime))

    flash(box, 'app__notes-item_plucked')
    soundStatus.textContent = describeString(box, midi) + (box === repeatBox ? ' · repeating' : '')
}

const stopRepeat = () => {
    if (!repeatBox) return
    clearInterval(repeatTimer)
    repeatTimer = null
    repeatBox.classList.remove('app__notes-item_active')
    repeatBox = null
    soundStatus.textContent = soundHint
}

const startRepeat = box => {
    stopRepeat()
    repeatBox = box
    box.classList.add('app__notes-item_active')
    pluckString(box)
    // каждый повтор заново читает ноту окошка, так что смена строя сразу слышна
    repeatTimer = setInterval(() => pluckString(box), REPEAT_INTERVAL)
}

// всё остановить: последовательности, повтор и звучащие ноты — перед новым воспроизведением
const stopPlayback = () => {
    stopSequence()
    stopRepeat()
    if (audioCtx) activeVoices.forEach(voice => releaseVoice(voice))
    chordVoices = []
}

/* ---------- гамма и аккорды ---------- */

// гамма выбранной тональности вверх до октавы; тоника — в 3-й октаве (C3…B3)
const playScale = () => {
    const root = keyRootSelect.value
    if (!root) return
    const ctx = getAudio()
    const rootMidi = 48 + NOTES.indexOf(root)
    const steps = [...SCALES[keyType], 12]
    const start = ctx.currentTime + 0.05
    steps.forEach((interval, i) => {
        const when = start + i * SCALE_STEP
        const voice = playMidi(rootMidi + interval, when)
        // каждая нота, кроме последней, гаснет, когда звучит следующая, — получается мелодия, а не каша
        if (i < steps.length - 1) releaseVoice(voice, when + SCALE_STEP + 0.12)
        later(() => {
            const chips = document.querySelectorAll('.key__notes .chip')
            flash(chips[i % chips.length], 'chip_playing')
            flashNeckNotes([NOTES[(rootMidi + interval) % 12]])
        }, (when - ctx.currentTime) * 1000)
    })
}

/* Расположение нот аккорда как на гитаре: основной тон в басу (E2…D#3), над ним квинта,
   октава, а сверху терция, квинта и септима. E -> E2 B2 E3 G#3 B3, как открытый аккорд E. */
const getChordVoicing = (root, quality) => {
    const bass = 40 + (NOTES.indexOf(root) - 4 + 12) % 12
    const [, third, fifth, seventh] = CHORDS[quality].intervals
    const voicing = [bass, bass + fifth, bass + 12, bass + 12 + third, bass + 12 + fifth]
    if (seventh !== undefined) voicing.push(bass + 12 + seventh)
    return voicing
}

const strumChord = (root, quality) => {
    const ctx = getAudio()
    chordVoices.forEach(voice => releaseVoice(voice))
    const start = ctx.currentTime + 0.03
    chordVoices = getChordVoicing(root, quality).map((midi, i) => playMidi(midi, start + i * CHORD_STRUM, 0.45))
    document.querySelectorAll('.chord__notes .chip').forEach(chip => flash(chip, 'chip_playing'))
    flashNeckNotes(getChordNotes(root, quality))
}

const playSelectedChord = () => {
    if (chordRootSelect.value) strumChord(chordRootSelect.value, chordQualitySelect.value)
}

// аккорды тональности по очереди с возвратом на тонику: I ii iii IV V vi vii° I; гриф показывает каждый
const playKeyChords = () => {
    const keyRoot = keyRootSelect.value
    if (!keyRoot) return
    const chords = getKeyChords(keyRoot, keyType, chordSize)
    ;[...chords, chords[0]].forEach((chord, i) => later(() => {
        chordRootSelect.value = chord.root
        chordQualitySelect.value = chord.quality
        highlightNeck()
        strumChord(chord.root, chord.quality)
    }, i * CHORD_STEP * 1000))
}

/* ---------- обработчики ---------- */

stringBoxes.forEach(box => {
    box.addEventListener('click', () => {
        stopSequence()
        if (!isRepeatOn) {
            pluckString(box)
        } else if (repeatBox === box) {
            stopRepeat()
        } else {
            startRepeat(box)
        }
    })
})

repeatBtn.addEventListener('click', () => {
    isRepeatOn = !isRepeatOn
    repeatBtn.setAttribute('aria-pressed', isRepeatOn)
    if (!isRepeatOn) stopRepeat()
})

// все струны по очереди, с 6-й (толстой) по 1-ю
playAllBtn.addEventListener('click', () => {
    stopPlayback()
    const order = [...stringBoxes].sort((a, b) => b.dataset.string - a.dataset.string)
    order.forEach((box, i) => later(() => pluckString(box), i * STRUM_INTERVAL))
})

keyPlayBtn.addEventListener('click', () => {
    stopPlayback()
    playScale()
})

chordPlayBtn.addEventListener('click', () => {
    stopPlayback()
    playSelectedChord()
})

chordPlayAllBtn.addEventListener('click', () => {
    stopPlayback()
    playKeyChords()
})

/* Клик по аккорду тональности: neck.js (его обработчик подключён раньше) уже выбрал аккорд
   или выключил его — если выбран, играем. */
document.querySelector('.chord__list').addEventListener('click', event => {
    if (!event.target.closest('.chord__item')) return
    stopSequence()
    playSelectedChord()
})

// пользователь что-то поменял сам — последовательность (Play all, гамма, аккорды тональности) прерываем
;[keyRootSelect, chordRootSelect, chordQualitySelect].forEach(select => select.addEventListener('change', stopSequence))
;[...keyTypeBtns, ...chordSizeBtns].forEach(btn => btn.addEventListener('click', stopSequence))
