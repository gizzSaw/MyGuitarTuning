/* Звук: струны (карточка «Tuning»), гамма и ноты тональности («Key»), аккорды и их ноты («Chord»),
   ноты на грифе и клавиши пианино. Звук синтезируется алгоритмом Карплуса — Стронга
   (модель дёрнутой струны), аудиофайлов нет.
   Подключается последним: пользуется NOTES/SCALES/CHORDS/getKeyChords (theory.js), select'ами,
   chordSize, neckNotes, highlightNeck() и getShapeVoicing() из neck.js. */

const REPEAT_INTERVAL = 2500 // мс между повторами струны в режиме Repeat
const STRUM_INTERVAL = 350   // мс между струнами в Play all
const SCALE_STEP = 0.32      // с между нотами гаммы
const CHORD_STRUM = 0.035    // с между нотами аккорда — как удар по струнам сверху вниз
const BASS_ARPEGGIO_STEP = 0.15 // с между нотами аккорда на басу: арпеджио снизу вверх, ноты звучат дальше

/* Тембры щипка. Динамики ноутбука и телефона не воспроизводят основной тон баса (30–60 Гц), высоту ухо
   восстанавливает по гармоникам; у щипка Карплуса — Стронга их и так много (~97% энергии выше 150 Гц).
   Бас ярче (начальный шум меньше сглажен) и звучит дольше: в полосе 150–4000 Гц хвост ноты громче на
   ~2 дБ через секунду и на 6–7 дБ через 2 с. Подъём середины фильтром давал лишь 0,5–1 дБ — не стали.
   Ни яркость, ни длительность не меняют период колебаний: высота точная (проверено, в том числе B0 и A0). */
const PLUCK_TIMBRES = {
    guitar: { smoothing: 0.5, decayTime: 3.5 },
    bass: { smoothing: 0.15, decayTime: 4.5 },
}
const CHORD_STEP = 1.4       // с между аккордами тональности в Play all

const playAllBtn = document.querySelector('.sound__all')
const repeatBtn = document.querySelector('.sound__repeat')
const soundStatus = document.querySelector('.sound__status')
const soundHint = soundStatus.textContent.trim()
const keyPlayBtn = document.querySelector('.key__play')
const chordPlayBtn = document.querySelector('.chord__play')
const chordPlayAllBtn = document.querySelector('.chord__play-all')

let audioCtx = null
let masterGain = null
const pluckBuffers = new Map()   // 'тембр:MIDI' -> готовый AudioBuffer
const activeVoices = new Set()   // все звучащие и запланированные ноты
const ringingStrings = new Map() // номер струны -> её звучащая нота (чтобы перезапустить, а не наложить)
let chordVoices = []             // ноты последнего аккорда — гасим их, когда звучит следующий
let sequenceTimers = []          // таймеры Play all, гаммы и аккордов тональности
let isRepeatOn = false
let repeatTimer = null
let repeatBox = null

/* MIDI-номер открытой струны показанной головки: общий строй выбранного в Tuning инструмента (getOpenMidis —
   в instrument.js). Drop D гитары -> D2 A2 D3 G3 B3 E4, Drop D баса -> D1 A1 D2 G2. */
const getStringMidi = box => getOpenMidis(getSelectedKey())[box.dataset.string - 1]

const midiToFrequency = midi => 440 * 2 ** ((midi - 69) / 12)

// 40 -> 'E2' (MIDI 60 — это C4)
const midiToName = midi => NOTES[midi % 12] + (Math.floor(midi / 12) - 1)

/* Карплус — Стронг: линия задержки длиной в один период заполняется шумом (щипок),
   а на каждом проходе соседние отсчёты усредняются — высокие гармоники гаснут быстрее низких,
   как у настоящей струны. Период почти никогда не равен целому числу отсчётов, поэтому
   дробный остаток добирает фазовый (allpass) фильтр: иначе нота звучала бы фальшиво на несколько центов. */
const synthesizePluck = (frequency, sampleRate, timbre = PLUCK_TIMBRES.guitar) => {
    const duration = 4                    // секунды
    const decayTime = timbre.decayTime    // за сколько секунд основной тон затихает на 60 дБ
    const length = Math.floor(duration * sampleRate)
    const samples = new Float32Array(length)

    // период = линия задержки + 0.5 отсчёта от усреднения + дробная задержка allpass-фильтра (0.1…1.1)
    const period = sampleRate / frequency
    const delayLength = Math.floor(period - 0.5 - 0.1)
    const fraction = period - 0.5 - delayLength
    const allpass = (1 - fraction) / (1 + fraction)
    const loss = 10 ** (-3 / (decayTime * frequency)) // затухание за один период

    // щипок: шум, сглаженный (мягче, как пальцем; у баса меньше — ярче), без постоянной составляющей
    const line = new Float32Array(delayLength)
    let smooth = 0
    for (let i = 0; i < delayLength; i++) {
        smooth = timbre.smoothing * smooth + (1 - timbre.smoothing) * (Math.random() * 2 - 1)
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

const getPluckBuffer = (midi, timbre) => {
    const key = `${timbre}:${midi}`
    if (!pluckBuffers.has(key)) {
        const samples = synthesizePluck(midiToFrequency(midi), audioCtx.sampleRate, PLUCK_TIMBRES[timbre])
        const buffer = audioCtx.createBuffer(1, samples.length, audioCtx.sampleRate)
        buffer.copyToChannel(samples, 0)
        pluckBuffers.set(key, buffer)
    }
    return pluckBuffers.get(key)
}

/* Тембр и октава звуков инструмента, выбранного в Tuning (струны головки, фишки Key/Chord, Play scale и
   Play chord): бас — свой тембр и на октаву ниже гитары. Ноты грифов звучат инструментом своей карточки. */
const instrumentTimbre = () => (isBass() ? 'bass' : 'guitar')
const instrumentOctave = () => (isBass() ? -12 : 0)

// щипок струны (Карплус — Стронг, см. synthesizePluck): звучит сам и затихает, отпускать не нужно
const makePluckVoice = (ctx, midi, when, volume, timbre, output) => {
    const source = ctx.createBufferSource()
    source.buffer = getPluckBuffer(midi, timbre)
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(output)
    source.start(when)
    return { source, gain }
}

/* Фортепиано (только в режиме джема). Две волны одной частоты из гармоник со строго кратными частотами,
   без сэмплов: «удар» (много верхних гармоник) гаснет за доли секунды, «корпус» (низкие гармоники) — медленно,
   пока клавиша зажата. Так яркость гаснет без фильтра: меняется только громкость волн, а фаза основного тона
   не сдвигается — высота точная (фильтр с подвижной частотой среза уводил её на доли цента).
   Удар 5 мс; после отпускания — мягкое затухание (release у голоса). */
const PIANO_PARTS = [
    { harmonics: [0, 1, 0.5, 0.25, 0.12, 0.06], level: 0.45, decay: (param, t) => {
        param.setTargetAtTime(0.22, t, 0.5)
        param.setTargetAtTime(0, t + 1.2, 3.5)
    } },
    { harmonics: [0, 0.6, 0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1, 0.07], level: 0.3, decay: (param, t) => {
        param.setTargetAtTime(0, t, 0.18)
    } },
]
const pianoWaves = new Map() // волна зависит от AudioContext (в проверках бывает OfflineAudioContext)
const getPianoWave = (ctx, index) => {
    if (!pianoWaves.has(ctx)) {
        pianoWaves.set(ctx, PIANO_PARTS.map(part =>
            ctx.createPeriodicWave(new Float32Array(part.harmonics.length), Float32Array.from(part.harmonics))))
    }
    return pianoWaves.get(ctx)[index]
}
const makePianoVoice = (ctx, midi, when, volume, output) => {
    const frequency = midiToFrequency(midi)
    const gain = ctx.createGain() // общая громкость голоса — её гасят releaseVoice и cancelVoice
    gain.gain.value = volume
    gain.connect(output)
    const oscillators = PIANO_PARTS.map((part, index) => {
        const osc = ctx.createOscillator()
        osc.setPeriodicWave(getPianoWave(ctx, index))
        osc.frequency.value = frequency
        const envelope = ctx.createGain()
        envelope.gain.setValueAtTime(0, when)
        envelope.gain.linearRampToValueAtTime(part.level, when + 0.005)
        part.decay(envelope.gain, when + 0.005)
        osc.connect(envelope).connect(gain)
        osc.start(when)
        return osc
    })
    // для releaseVoice и activeVoices голос выглядит как щипок: source.stop() и source.onended
    const source = {
        stop: time => oscillators.forEach(osc => osc.stop(time)),
        set onended(callback) { oscillators[0].onended = callback },
    }
    return { source, gain, release: 0.12 }
}

/* Сыграть ноту в момент when (секунды по часам AudioContext) тембром timbre ('guitar' | 'bass' | 'piano');
   возвращает «голос», чтобы его можно было погасить. midi, timbre и when в голосе — для проверок. */
const playMidi = (midi, when, volume = 1, timbre = instrumentTimbre()) => {
    const ctx = getAudio()
    const voice = timbre === 'piano'
        ? makePianoVoice(ctx, midi, when, volume, masterGain)
        : makePluckVoice(ctx, midi, when, volume, timbre, masterGain)
    Object.assign(voice, { midi, timbre, when })
    activeVoices.add(voice)
    voice.source.onended = () => activeVoices.delete(voice)
    return voice
}

// быстро погасить ноту (как прижать струну ладонью); если она ещё не началась — просто не прозвучит
const releaseVoice = (voice, when = audioCtx.currentTime) => {
    if (voice.released) return // повторный stop() у одной ноты старый Safari считает ошибкой
    voice.released = true
    const fade = voice.release || 0.03 // у фортепиано затухание после отпускания мягче
    voice.gain.gain.setTargetAtTime(0, when, fade)
    voice.source.stop(when + Math.max(0.2, fade * 6))
}

// анимация вспышки; удаление класса и чтение offsetWidth перезапускают анимацию
const flash = (element, className) => {
    if (!element) return
    element.classList.remove(className)
    void element.offsetWidth
    element.classList.add(className)
}

// подсветить на грифе все места с этими высотами (0–11); по названию нельзя — на грифе может быть B♭, а не A♯
const flashNeckNotes = pitches => neckNotes.forEach(note => {
    if (pitches.includes(pitchOf(note.textContent))) flash(note, 'note_playing')
})

/* Нажать клавишу пианино с этой нотой. Если такой высоты на видимой клавиатуре нет (бас ниже C3, высокие
   ноты выше C5, на телефоне видна одна октава) — та же нота в ближайшей видимой октаве. */
const flashPianoKey = midi => {
    const visible = [...document.querySelectorAll('.piano__key')]
        .filter(key => key.dataset.midi % 12 === midi % 12 && key.offsetParent !== null)
    if (!visible.length) return
    const nearest = visible.reduce((best, key) =>
        (Math.abs(key.dataset.midi - midi) < Math.abs(best.dataset.midi - midi) ? key : best))
    flash(nearest, 'piano__key_playing')
}

const later = (callback, ms) => sequenceTimers.push(setTimeout(callback, ms))

/* Заглушить ещё не начавшуюся ноту совсем. releaseVoice тут не подходит: гамма назначает затухание нотам
   заранее (released уже true), а второй stop() старый Safari считает ошибкой — поэтому громкость в ноль сразу. */
const cancelVoice = voice => {
    const now = audioCtx.currentTime
    voice.gain.gain.cancelScheduledValues(now)
    voice.gain.gain.setValueAtTime(0, now)
    voice.released = true
    voice.cancelled = true // для проверок: нота заглушена до начала
    try {
        voice.source.stop(now)
    } catch (error) {
        // stop уже назначен раньше — тишину и так даёт нулевая громкость
    }
}

/* Прервать последовательность (Play all, гамма, аккорды тональности): таймеры и ещё не начавшиеся ноты —
   гамма планирует все ноты заранее по часам AudioContext, без этого она доиграла бы до конца. */
const stopSequence = () => {
    sequenceTimers.forEach(clearTimeout)
    sequenceTimers = []
    if (audioCtx) activeVoices.forEach(voice => { if (voice.when > audioCtx.currentTime) cancelVoice(voice) })
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
    flashPianoKey(midi)
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
    const rootMidi = 48 + instrumentOctave() + NOTES.indexOf(root) // гитара C3…B3, бас C2…B2
    // гамма любой длины (5–7 ступеней) и сверху октава тоники
    const steps = [...SCALES[keyTypeSelect.value], 12]
    const start = ctx.currentTime + 0.05
    steps.forEach((interval, i) => {
        const when = start + i * SCALE_STEP
        const voice = playMidi(rootMidi + interval, when)
        // каждая нота, кроме последней, гаснет, когда звучит следующая, — получается мелодия, а не каша
        if (i < steps.length - 1) releaseVoice(voice, when + SCALE_STEP + 0.12)
        later(() => {
            const chips = document.querySelectorAll('.key__notes .chip')
            flash(chips[i % chips.length], 'chip_playing')
            flashNeckNotes([(rootMidi + interval) % 12])
            flashPianoKey(rootMidi + interval)
        }, (when - ctx.currentTime) * 1000)
    })
}

/* Запасное расположение нот, если аппликатуры нет (см. strumChord; на басу — всегда): основной тон в басу
   (гитара E2…D♯3, бас — на октаву ниже), над ним квинта,
   октава, а сверху терция, квинта и септима. E -> E2 B2 E3 G♯3 B3, как открытый аккорд E. */
const getChordVoicing = (root, quality) => {
    const bass = 40 + instrumentOctave() + (NOTES.indexOf(root) - 4 + 12) % 12 // гитара E2…D♯3, бас E1…D♯2
    const [, third, fifth, seventh] = CHORDS[quality].intervals
    const voicing = [bass, bass + fifth, bass + 12, bass + 12 + third, bass + 12 + fifth]
    if (seventh !== undefined) voicing.push(bass + 12 + seventh)
    return voicing
}

/* Гитара — бой по выбранной аппликатуре (getShapeVoicing из neck.js): ноты с конкретных струн и ладов,
   от баса вверх, на гитарном грифе вспыхивают именно эти клетки. Бас (аппликатур нет) и гитара без позиций —
   запасное расположение getChordVoicing. */
const strumChord = (root, quality) => {
    const ctx = getAudio()
    chordVoices.forEach(voice => releaseVoice(voice))
    const start = ctx.currentTime + 0.03
    const shapeNotes = isBass() ? null : getShapeVoicing()
    const voicing = shapeNotes ? shapeNotes.map(note => note.midi) : getChordVoicing(root, quality)
    // гитара — бой (почти вместе), бас — арпеджио: аккорд из низких нот вместе звучит грязно
    const step = isBass() ? BASS_ARPEGGIO_STEP : CHORD_STRUM
    chordVoices = voicing.map((midi, i) => playMidi(midi, start + i * step, 0.45))
    voicing.forEach(flashPianoKey)
    document.querySelectorAll('.chord__notes .chip').forEach(chip => flash(chip, 'chip_playing'))
    if (shapeNotes) shapeNotes.forEach(note => flash(note.note, 'note_playing'))
    else flashNeckNotes(voicing.map(midi => midi % 12))
}

const playSelectedChord = () => {
    if (chordRootSelect.value) strumChord(chordRootSelect.value, chordQualitySelect.value)
}

// аккорды тональности по очереди с возвратом на тонику: I ii iii IV V vi vii° I; гриф показывает каждый
const playKeyChords = () => {
    const keyRoot = keyRootSelect.value
    if (!keyRoot) return
    const chords = getKeyChords(keyRoot, keyTypeSelect.value, chordSize)
    ;[...chords, chords[0]].forEach((chord, i) => later(() => {
        chordRootSelect.value = chord.root
        chordQualitySelect.value = chord.quality
        highlightNeck()
        strumChord(chord.root, chord.quality)
    }, i * CHORD_STEP * 1000))
}

/* ---------- отдельные ноты: фишки, гриф, пианино ---------- */

// сыграть одну ноту и подсветить то, на что нажали; тембр по умолчанию — инструмента из Tuning
const playNote = (midi, element, flashClass, timbre = instrumentTimbre()) => {
    stopSequence()
    playMidi(midi, getAudio().currentTime, 1, timbre)
    flash(element, flashClass)
    flashPianoKey(midi)
}

// фишки нот звучат в той же октаве, что и гамма: тоника — C3…B3 у гитары, C2…B2 у баса
const chipMidi = (root, intervals, chip) => {
    const index = [...chip.closest('.key__notes, .chord__notes').querySelectorAll('.chip')].indexOf(chip)
    return 48 + instrumentOctave() + NOTES.indexOf(root) + intervals[index]
}

// нота на грифе: открытая струна инструмента этого грифа + номер лада (data-string, data-fret — fretboard.js)
const neckNoteMidi = note =>
    getOpenMidis(fretboardKey(note.closest('.guitar-neck__inner')))[note.dataset.string - 1] + Number(note.dataset.fret)

/* Нажатие: мышью — сразу на pointerdown (без задержки до отпускания кнопки), пальцем — по click,
   чтобы прокрутка длинного грифа на телефоне не играла ноты, клавиатурой — по click (detail === 0). */
let pressedWithMouse = false
const onPress = (container, selector, handler) => {
    container.addEventListener('pointerdown', event => {
        pressedWithMouse = event.pointerType === 'mouse'
        if (!pressedWithMouse || event.button !== 0) return
        const target = event.target.closest(selector)
        if (target) handler(target)
    })
    container.addEventListener('click', event => {
        if (pressedWithMouse && event.detail !== 0) return // мышью уже сыграли на pointerdown
        const target = event.target.closest(selector)
        if (target) handler(target)
    })
}

/* ---------- обработчики ---------- */

onPress(document.querySelector('.app__inner'), '.app__notes-item', box => {
    stopSequence()
    if (!isRepeatOn) {
        pluckString(box)
    } else if (repeatBox === box) {
        stopRepeat()
    } else {
        startRepeat(box)
    }
})

onPress(document.querySelector('.key__notes'), '.chip', chip =>
    playNote(chipMidi(keyRootSelect.value, SCALES[keyTypeSelect.value], chip), chip, 'chip_playing'))

onPress(document.querySelector('.chord__notes'), '.chip', chip =>
    playNote(chipMidi(chordRootSelect.value, CHORDS[chordQualitySelect.value].intervals, chip), chip, 'chip_playing'))

// ноты грифов: гриф гитары звучит гитарой, гриф баса — басом, кто бы ни был выбран в Tuning
document.querySelectorAll('.guitar-neck__inner').forEach(board => {
    const timbre = board.dataset.instrument === 'bass' ? 'bass' : 'guitar'
    onPress(board, '.note', note => playNote(neckNoteMidi(note), note, 'note_playing', timbre))
})

onPress(document.querySelector('.piano__keys'), '.piano__key', key =>
    playNote(Number(key.dataset.midi), key, 'piano__key_playing'))

repeatBtn.addEventListener('click', () => {
    isRepeatOn = !isRepeatOn
    repeatBtn.setAttribute('aria-pressed', isRepeatOn)
    if (!isRepeatOn) stopRepeat()
})

// все струны по очереди, с самой толстой по 1-ю
playAllBtn.addEventListener('click', () => {
    stopPlayback()
    const order = getStringBoxes().reverse() // от самой толстой струны; окошек столько, сколько струн у инструмента
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

// переключили позицию ← → — сразу играем её (обработчик neck.js подключён раньше и уже сменил позицию)
document.querySelectorAll('.chord__shape-btn').forEach(btn => btn.addEventListener('click', () => {
    stopSequence()
    playSelectedChord()
}))

// пользователь что-то поменял сам — последовательность (Play all, гамма, аккорды тональности) прерываем
;[keyRootSelect, keyTypeSelect, chordRootSelect, chordQualitySelect].forEach(select => select.addEventListener('change', stopSequence))
chordSizeBtns.forEach(btn => btn.addEventListener('click', stopSequence))
