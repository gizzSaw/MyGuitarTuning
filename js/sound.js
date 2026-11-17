/* Звук для настройки на слух: клик по окошку струны в карточке «Tuning» играет её ноту
   на реальной высоте (E2 … E4 в стандартном строе).
   Звук синтезируется алгоритмом Карплуса — Стронга (модель дёрнутой струны), аудиофайлов нет.
   NOTES объявлен в main.js — здесь он используется только внутри функций. */

// высота открытых струн в стандартном строе, MIDI-номера: E2 A2 D3 G3 B3 E4
const STANDARD_MIDI = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 }

const REPEAT_INTERVAL = 2500 // мс между повторами в режиме Repeat
const STRUM_INTERVAL = 350   // мс между струнами в Play all

const stringBoxes = document.querySelectorAll('.app__notes-item')
const playAllBtn = document.querySelector('.sound__all')
const repeatBtn = document.querySelector('.sound__repeat')
const soundStatus = document.querySelector('.sound__status')
const soundHint = soundStatus.textContent.trim()

let audioCtx = null
let masterGain = null
const pluckBuffers = new Map() // MIDI-номер -> готовый AudioBuffer
const ringingVoices = new Map() // номер струны -> звучащая нота (чтобы перезапустить, а не наложить)
let isRepeatOn = false
let repeatTimer = null
let repeatBox = null
let strumTimers = []

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

    // одинаковая громкость у всех струн и плавный конец без щелчка
    const fadeLength = Math.floor(0.3 * sampleRate)
    for (let i = 0; i < length; i++) {
        const fade = Math.min(1, (length - i) / fadeLength)
        samples[i] *= (0.8 / peak) * fade
    }
    return samples
}

// AudioContext создаём при первом клике: до действия пользователя браузер звук не разрешает
const getAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        masterGain = audioCtx.createGain()
        masterGain.gain.value = 0.7
        masterGain.connect(audioCtx.destination)
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

// анимация «щипка» на окошке; удаление класса и чтение offsetWidth перезапускают анимацию
const flashBox = box => {
    box.classList.remove('app__notes-item_plucked')
    void box.offsetWidth
    box.classList.add('app__notes-item_plucked')
}

const describeString = (box, midi) =>
    `String ${box.dataset.string} · ${midiToName(midi)} · ${midiToFrequency(midi).toFixed(2)} Hz`

const pluckString = box => {
    const ctx = getAudio()
    const midi = getStringMidi(box)
    const string = box.dataset.string

    // если струна ещё звучит — быстро гасим её, как при повторном щипке настоящей струны
    const ringing = ringingVoices.get(string)
    if (ringing) {
        ringing.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.015)
        ringing.source.stop(ctx.currentTime + 0.1)
    }

    const source = ctx.createBufferSource()
    source.buffer = getPluckBuffer(midi)
    const gain = ctx.createGain()
    source.connect(gain).connect(masterGain)
    source.start()
    const voice = { source, gain }
    ringingVoices.set(string, voice)
    source.onended = () => {
        if (ringingVoices.get(string) === voice) ringingVoices.delete(string)
    }

    flashBox(box)
    soundStatus.textContent = describeString(box, midi) + (box === repeatBox ? ' · repeating' : '')
}

const stopRepeat = () => {
    clearInterval(repeatTimer)
    repeatTimer = null
    if (repeatBox) repeatBox.classList.remove('app__notes-item_active')
    repeatBox = null
}

const startRepeat = box => {
    stopRepeat()
    repeatBox = box
    box.classList.add('app__notes-item_active')
    pluckString(box)
    // каждый повтор заново читает ноту окошка, так что смена строя сразу слышна
    repeatTimer = setInterval(() => pluckString(box), REPEAT_INTERVAL)
}

const stopStrum = () => {
    strumTimers.forEach(clearTimeout)
    strumTimers = []
}

stringBoxes.forEach(box => {
    box.addEventListener('click', () => {
        stopStrum()
        if (!isRepeatOn) {
            pluckString(box)
        } else if (repeatBox === box) {
            stopRepeat()
            soundStatus.textContent = soundHint
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
    stopRepeat()
    stopStrum()
    const order = [...stringBoxes].sort((a, b) => b.dataset.string - a.dataset.string)
    strumTimers = order.map((box, i) => setTimeout(() => pluckString(box), i * STRUM_INTERVAL))
})
