/* Подсветка тональности на грифе.
   Файл подключается ДО main.js: main.js вызывает highlightKey() после каждой перерисовки грифа.
   Поэтому на верхнем уровне здесь нельзя пользоваться NOTES — он объявлен в main.js
   и доступен только внутри функций, которые вызываются позже.
   Имена констант не должны совпадать с именами в main.js (у скриптов общая область видимости). */

// ступени гаммы — интервалы от тоники в полутонах
const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], // натуральный мажор
    minor: [0, 2, 3, 5, 7, 8, 10], // натуральный минор
    blues: [0, 3, 5, 6, 7, 10],    // блюзовая гамма (минорная): 1 b3 4 b5 5 b7
}

const keyRootSelect = document.querySelector('#keyRoot')
const keyTypeBtns = document.querySelectorAll('.key__types .segmented__btn') // Major | Minor | Blues
let keyType = 'major'
const keyNotesLine = document.querySelector('.key__notes')
const keyHintText = keyNotesLine.textContent.trim()
const neckNotes = document.querySelectorAll('.guitar-neck .note')

// ноты гаммы начиная с тоники: getScaleNotes('A', 'minor') -> ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const getScaleNotes = (root, type) => {
    const rootIndex = NOTES.indexOf(root)
    return SCALES[type].map(interval => NOTES[(rootIndex + interval) % NOTES.length])
}

const highlightKey = () => {
    const root = keyRootSelect.value // '' — тональность не выбрана
    const scaleNotes = root ? getScaleNotes(root, keyType) : []

    neckNotes.forEach(note => {
        const noteName = note.textContent
        const inKey = scaleNotes.includes(noteName)
        note.classList.toggle('note_root', noteName === root)
        note.classList.toggle('note_scale', inKey && noteName !== root)
        note.classList.toggle('note_out', root !== '' && !inKey)
    })

    // строка под выбором: ноты гаммы (тоника выделена) или подсказка, если тональность не выбрана
    if (!root) {
        const hint = document.createElement('span')
        hint.className = 'key__hint'
        hint.textContent = keyHintText
        keyNotesLine.replaceChildren(hint)
        return
    }
    keyNotesLine.replaceChildren(...scaleNotes.map((noteName, i) => {
        const span = document.createElement('span')
        span.textContent = noteName
        span.className = i === 0 ? 'key__note key__note_root' : 'key__note'
        return span
    }))
}

keyRootSelect.addEventListener('change', highlightKey)
keyTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        keyType = btn.dataset.scale
        // активная кнопка переключателя — aria-pressed="true", её подсвечивает CSS
        keyTypeBtns.forEach(other => other.setAttribute('aria-pressed', other === btn))
        highlightKey()
    })
})
